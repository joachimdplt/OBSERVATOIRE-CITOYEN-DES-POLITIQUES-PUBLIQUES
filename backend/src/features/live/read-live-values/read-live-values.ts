import {
  Controller,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { type LiveLayout, readLiveRows } from '../../../domain/live-reading';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  TABULAR_SOURCE,
  type TabularSource,
} from '../../../ports/tabular-source';

/** Une lecture se réutilise un jour ; après, on demande au producteur si le fichier a changé. */
const FRESH_MS = 24 * 3600 * 1000;

/**
 * Un visiteur ouvre une commune : pour chaque source lue à la demande,
 * l'outil lit les lignes de la commune chez le producteur, ou réutilise la
 * dernière lecture si le fichier n'a pas changé depuis. Chaque valeur sort
 * telle que publiée, avec la date de la lecture et l'adresse des lignes :
 * « lu automatiquement à la source ».
 */
@Controller('public/territories')
export class ReadLiveValuesController {
  private readonly logger = new Logger(ReadLiveValuesController.name);

  constructor(
    private prisma: PrismaService,
    @Inject(TABULAR_SOURCE) private tabular: TabularSource,
  ) {}

  @Get(':level/:code/live')
  async read(@Param('level') level: string, @Param('code') code: string) {
    if (level !== 'commune' && level !== 'municipal_district')
      throw new NotFoundException('Seules les communes se lisent à la demande');
    const territory = code.toUpperCase();
    const sources = await this.prisma.liveSource.findMany({
      orderBy: { title: 'asc' },
    });
    const out = [];
    for (const source of sources) {
      const layout = source.layout as unknown as LiveLayout;
      const reading = await this.readingFor(source, layout, territory);
      if (!reading) continue;
      out.push({
        source: {
          slug: source.slug,
          title: source.title,
          producer: source.producer,
          pillar: source.pillar,
          datasetUrl: source.datasetUrl,
          license: source.license,
          rowsUrl: this.tabular.rowsUrl(
            source.resourceId,
            layout.territoryColumn,
            territory,
          ),
        },
        fetchedAt: reading.fetchedAt,
        resourceModifiedAt: reading.resourceModifiedAt,
        values: readLiveRows(reading.rows as Record<string, unknown>[], layout),
      });
    }
    return { territory, sources: out };
  }

  /** La dernière lecture, ou une nouvelle si elle est ancienne et que le fichier a changé. */
  private async readingFor(
    source: { id: string; resourceId: string },
    layout: LiveLayout,
    territory: string,
  ) {
    const last = await this.prisma.liveReading.findFirst({
      where: { sourceId: source.id, territoryCode: territory },
      orderBy: { fetchedAt: 'desc' },
    });
    if (last && Date.now() - last.fetchedAt.getTime() < FRESH_MS) return last;
    try {
      const modified = await this.tabular.lastModified(source.resourceId);
      if (
        last &&
        modified &&
        last.resourceModifiedAt &&
        modified.getTime() === last.resourceModifiedAt.getTime()
      )
        return last;
      const rows = await this.tabular.rows(
        source.resourceId,
        layout.territoryColumn,
        territory,
      );
      return await this.prisma.liveReading.create({
        data: {
          sourceId: source.id,
          territoryCode: territory,
          resourceModifiedAt: modified,
          rows: rows as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Le producteur ne répond pas : la dernière lecture, si elle existe.
      this.logger.warn(`Lecture impossible : ${(err as Error).message}`);
      return last;
    }
  }
}
