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

/** L'équipe voit toutes les versions d'un jeu, la plus récente en premier, aucune effacée. */
@Controller('admin/datasets')
@UseGuards(SessionGuard)
@Requires('edit')
export class ListDatasetVersionsController {
  constructor(private prisma: PrismaService) {}

  @Get(':datasetId/versions')
  async list(@Param('datasetId', ParseUUIDPipe) datasetId: string) {
    const dataset = await this.prisma.sourceDataset.findUnique({
      where: { id: datasetId },
    });
    if (!dataset) throw new NotFoundException('Jeu de données inconnu');

    const versions = await this.prisma.datasetVersion.findMany({
      where: { datasetId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true } },
        importJob: { select: { id: true, rowCount: true, state: true } },
      },
    });
    return versions.map((v) => ({
      id: v.id,
      vintage: v.vintage,
      state: v.state,
      fileName: v.fileName,
      fileHash: v.fileHash,
      collectedAt: v.collectedAt,
      depositedAt: v.createdAt,
      depositedBy: v.createdBy.name,
      importJob: v.importJob,
    }));
  }
}
