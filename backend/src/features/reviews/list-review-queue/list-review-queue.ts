import { Controller, Get, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { VersionState } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Une personne qui relit voit les versions qui attendent une décision,
 * soumises ou prépubliées : le jeu, le millésime, qui a soumis et quand, l'adresse du fichier d'origine,
 * et ce que le contrôle a compté.
 */
@Controller('admin/review-queue')
@UseGuards(SessionGuard)
@Requires('review')
export class ListReviewQueueController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const versions = await this.prisma.datasetVersion.findMany({
      where: { state: { in: [VersionState.in_review, VersionState.preprint] } },
      orderBy: { submittedAt: 'asc' },
      include: {
        dataset: {
          select: { title: true, provider: { select: { acronym: true } } },
        },
        submittedBy: { select: { id: true, name: true } },
        importJob: { select: { id: true, rowCount: true } },
      },
    });
    const counts = await this.prisma.observation.groupBy({
      by: ['versionId', 'status'],
      where: { versionId: { in: versions.map((v) => v.id) } },
      _count: { _all: true },
    });
    return versions.map((v) => ({
      id: v.id,
      dataset: `${v.dataset.provider.acronym} · ${v.dataset.title}`,
      vintage: v.vintage,
      state: v.state,
      fileName: v.fileName,
      fileUrl: v.fileUrl,
      submittedBy: v.submittedBy,
      submittedAt: v.submittedAt,
      importJobId: v.importJob?.id ?? null,
      observations: Object.fromEntries(
        counts
          .filter((c) => c.versionId === v.id)
          .map((c) => [c.status, c._count._all]),
      ),
    }));
  }
}
