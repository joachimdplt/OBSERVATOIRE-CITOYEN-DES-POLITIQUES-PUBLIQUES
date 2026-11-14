import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { PrismaService } from '../../../prisma/prisma.service';

const SAMPLE_SIZE = 20;

/**
 * L'équipe ouvre la lecture d'un fichier déposé : les onglets, la ligne
 * d'en-têtes, les colonnes, et les vingt premières lignes telles que lues.
 * C'est l'écran sur lequel on décrira les colonnes.
 */
@Controller('admin/import-jobs')
@UseGuards(SessionGuard)
@Requires('edit')
export class GetImportJobController {
  constructor(private prisma: PrismaService) {}

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id },
      include: {
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
      where: { jobId: id, rowNumber: { gte: job.headerRow } },
      orderBy: { rowNumber: 'asc' },
      take: SAMPLE_SIZE + 1,
    });

    return {
      id: job.id,
      state: job.state,
      format: job.format,
      sheetNames: job.sheetNames,
      sheet: job.sheet,
      headerRow: job.headerRow,
      rowCount: job.rowCount,
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
