import {
  BadRequestException,
  Controller,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import type { Category } from '../../../domain/category';
import {
  firstDataRow,
  type ImportDescription,
} from '../../../domain/import-description';
import type { Prisma } from '../../../generated/prisma/client';
import {
  AnomalySeverity,
  ImportState,
  ObservationStatus,
  IndicatorKind,
  TerritoryLevel,
} from '../../../generated/prisma/enums';
import {
  OBSERVATION_NORMALIZER,
  type Anomaly,
  type ObservationNormalizer,
  type ValueReading,
} from '../../../ports/observation-normalizer';
import { PrismaService } from '../../../prisma/prisma.service';
import { headerOf, loadDraftJob } from '../import-job';

/** Au-delà, les anomalies bloquantes ne sont plus détaillées une à une : le fichier est à revoir. */
const MAX_DETAILED_ANOMALIES = 1000;
const ROWS_PER_INSERT = 1000;

/**
 * L'équipe contrôle un fichier décrit. Chaque ligne est lue selon la
 * description, chaque code rattaché à un territoire du millésime déclaré, et
 * chaque doublon repéré.
 *
 * Une seule anomalie bloquante, et aucune observation n'est écrite : on
 * corrige la description, ou on dépose un fichier corrigé. Sans anomalie
 * bloquante, les observations sont écrites, prêtes à être soumises.
 *
 * Contrôler à nouveau remplace le contrôle précédent : seul le dernier compte.
 */
@Controller('admin/import-jobs')
@UseGuards(SessionGuard)
@Requires('edit')
export class ValidateImportJobController {
  constructor(
    private prisma: PrismaService,
    @Inject(OBSERVATION_NORMALIZER) private normalizer: ObservationNormalizer,
  ) {}

  @Post(':id/validate')
  @HttpCode(200)
  async validate(@Param('id', ParseUUIDPipe) id: string) {
    const job = await loadDraftJob(this.prisma, id);
    const description = job.description as ImportDescription | null;
    if (!description)
      throw new BadRequestException(
        'Décrivez d’abord les colonnes du fichier.',
      );

    const header = await headerOf(this.prisma, id, description.headerRow);
    const rows = await this.prisma.rawRow.findMany({
      where: {
        jobId: id,
        rowNumber: {
          gte: firstDataRow(description),
          ...(description.lastRow ? { lte: description.lastRow } : {}),
        },
      },
      orderBy: { rowNumber: 'asc' },
    });
    // Chaque colonne décrite lit un nombre, ou une catégorie de la liste de son indicateur.
    const indicators = await this.prisma.indicatorDefinition.findMany({
      where: { code: { in: description.values.map((v) => v.indicatorCode) } },
      select: { id: true, code: true, kind: true, categories: true },
    });
    const indicatorId = new Map(indicators.map((i) => [i.code, i.id]));
    const readings = new Map<string, ValueReading>(
      indicators.map((i) => [
        i.code,
        i.kind === IndicatorKind.category
          ? { kind: 'category', categories: i.categories as Category[] }
          : { kind: 'number' },
      ]),
    );

    const { candidates, anomalies } = this.normalizer.normalize(
      header,
      rows.map((r) => ({ rowNumber: r.rowNumber, cells: r.cells as string[] })),
      description,
      readings,
    );

    // Les territoires connus du millésime déclaré. Une colonne de communes se
    // lit aussi parmi les arrondissements municipaux : la DREES donne Paris,
    // Lyon et Marseille par arrondissement, et un code INSEE de commune ne
    // désigne jamais un arrondissement.
    const levels =
      description.territory.level === TerritoryLevel.commune
        ? [TerritoryLevel.commune, TerritoryLevel.municipal_district]
        : [description.territory.level];
    const territories = await this.prisma.territory.findMany({
      where: {
        level: { in: levels },
        vintage: description.territory.vintage,
        code: { in: [...new Set(candidates.map((c) => c.territory.code))] },
      },
      select: { id: true, code: true, level: true },
    });
    const districts = territories.filter(
      (t) => t.level === TerritoryLevel.municipal_district,
    ).length;
    if (districts > 0) {
      anomalies.push({
        rowNumber: null,
        column: description.territory.column,
        kind: 'municipal_districts',
        severity: AnomalySeverity.info,
        message: `${districts} code(s) d'arrondissement municipal (Paris, Lyon, Marseille) lus à leur niveau, pas à celui de la commune.`,
      });
    }
    const territoryId = new Map(territories.map((t) => [t.code, t.id]));

    const unknownReported = new Set<number>();
    const seen = new Map<string, number>();
    const observations: Prisma.ObservationCreateManyInput[] = [];
    for (const c of candidates) {
      const tId = territoryId.get(c.territory.code);
      if (!tId) {
        if (!unknownReported.has(c.rowNumber)) {
          unknownReported.add(c.rowNumber);
          anomalies.push({
            rowNumber: c.rowNumber,
            column: description.territory.column,
            kind: 'unknown_territory',
            severity: AnomalySeverity.blocking,
            message: `Le code « ${c.territory.code} » n'existe pas dans le COG ${description.territory.vintage}.`,
          });
        }
        continue;
      }
      const key = `${c.indicatorCode}|${c.territory.code}|${c.period}`;
      const first = seen.get(key);
      if (first !== undefined) {
        anomalies.push({
          rowNumber: c.rowNumber,
          column: null,
          kind: 'duplicate',
          severity: AnomalySeverity.blocking,
          message: `${c.indicatorCode}, ${c.territory.code}, ${c.period} : déjà lu à la ligne ${first}.`,
        });
        continue;
      }
      seen.set(key, c.rowNumber);
      observations.push({
        indicatorId: indicatorId.get(c.indicatorCode)!,
        territoryId: tId,
        period: c.period,
        status: c.status,
        value: c.value,
        category: c.category,
        referenceDate: c.referenceDate ? new Date(c.referenceDate) : null,
        versionId: job.versionId,
        rowNumber: c.rowNumber,
      });
    }

    const blocking = anomalies.filter(
      (a) => a.severity === AnomalySeverity.blocking,
    );
    const kept = keepReadable(anomalies, blocking.length);
    const valid = blocking.length === 0;

    await this.prisma.$transaction(
      async (tx) => {
        await tx.importAnomaly.deleteMany({ where: { jobId: id } });
        await tx.observation.deleteMany({
          where: { versionId: job.versionId },
        });
        await tx.importAnomaly.createMany({
          data: kept.map((a) => ({ ...a, jobId: id })),
        });
        if (valid) {
          for (
            let start = 0;
            start < observations.length;
            start += ROWS_PER_INSERT
          ) {
            await tx.observation.createMany({
              data: observations.slice(start, start + ROWS_PER_INSERT),
            });
          }
        }
        await tx.importJob.update({
          where: { id },
          data: {
            state: valid ? ImportState.validated : ImportState.needs_correction,
            validatedAt: valid ? new Date() : null,
          },
        });
      },
      { timeout: 120_000 },
    );

    const count = (status: ObservationStatus) =>
      valid ? observations.filter((o) => o.status === status).length : 0;
    return {
      state: valid ? ImportState.validated : ImportState.needs_correction,
      rowsRead: rows.length,
      blockingCount: blocking.length,
      observations: {
        documented: count(ObservationStatus.documented),
        not_documented: count(ObservationStatus.not_documented),
        confidential: count(ObservationStatus.confidential),
        not_applicable: count(ObservationStatus.not_applicable),
      },
      anomalies: kept,
    };
  }
}

/** Les informations, puis les bloquantes jusqu'au plafond, et un résumé du reste. */
function keepReadable(anomalies: Anomaly[], blockingCount: number): Anomaly[] {
  const info = anomalies.filter((a) => a.severity === AnomalySeverity.info);
  const blocking = anomalies
    .filter((a) => a.severity === AnomalySeverity.blocking)
    .sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
  const detailed = blocking.slice(0, MAX_DETAILED_ANOMALIES);
  if (blockingCount > MAX_DETAILED_ANOMALIES) {
    detailed.push({
      rowNumber: null,
      column: null,
      kind: 'too_many',
      severity: AnomalySeverity.blocking,
      message: `${blockingCount - MAX_DETAILED_ANOMALIES} autre(s) anomalie(s) bloquante(s) non détaillée(s) : la description ou le fichier est à revoir.`,
    });
  }
  return [...detailed, ...info];
}
