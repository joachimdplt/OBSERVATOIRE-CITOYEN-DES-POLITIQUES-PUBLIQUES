import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

const SAMPLE_SIZE = 20;

/**
 * L'équipe ouvre la lecture d'un fichier déposé : les onglets, la ligne
 * d'en-têtes, les colonnes, et les vingt premières lignes telles que lues.
 * C'est l'écran sur lequel on décrira les colonnes.
 *
 * `?headerRow=` montre les colonnes lues à une autre ligne, avant de
 * l'enregistrer : un tableur commence souvent par un titre et des notes.
 */
@Controller('admin/import-jobs')
@UseGuards(SessionGuard)
@Requires('edit')
export class GetImportJobController {
  constructor(private prisma: PrismaService) {}

  @Get(':id')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('headerRow', new ParseIntPipe({ optional: true }))
    headerRow?: number,
  ) {
    const job = await this.prisma.importJob.findUnique({
      where: { id },
      include: {
        anomalies: { orderBy: [{ severity: 'asc' }, { rowNumber: 'asc' }] },
        version: {
          include: {
            dataset: { select: { id: true, title: true } },
            createdBy: { select: { name: true } },
          },
        },
      },
    });
    if (!job) throw new NotFoundException('Import inconnu');

    const [header, ...sample] = await this.prisma.rawRow.findMany({
      where: { jobId: id, rowNumber: { gte: headerRow ?? job.headerRow } },
      orderBy: { rowNumber: 'asc' },
      take: SAMPLE_SIZE + 1,
    });

    const counts = await this.prisma.observation.groupBy({
      by: ['status'],
      where: { versionId: job.versionId },
      _count: { _all: true },
    });

    return {
      id: job.id,
      observations: Object.fromEntries(
        counts.map((c) => [c.status, c._count._all]),
      ),
      state: job.state,
      format: job.format,
      sheetNames: job.sheetNames,
      sheet: job.sheet,
      headerRow: headerRow ?? job.headerRow,
      rowCount: job.rowCount,
      description: job.description,
      validatedAt: job.validatedAt,
      anomalies: job.anomalies.map(
        ({ rowNumber, column, kind, severity, message }) => ({
          rowNumber,
          column,
          kind,
          severity,
          message,
        }),
      ),
      version: {
        id: job.version.id,
        vintage: job.version.vintage,
        state: job.version.state,
        fileName: job.version.fileName,
        fileHash: job.version.fileHash,
        fileUrl: job.version.fileUrl,
        collectedAt: job.version.collectedAt,
        depositedBy: job.version.createdBy.name,
        dataset: job.version.dataset,
      },
      columns: (header?.cells as string[] | undefined) ?? [],
      sample: sample.map((row) => ({
        rowNumber: row.rowNumber,
        cells: row.cells as string[],
      })),
    };
  }
}
