import { ConflictException, NotFoundException } from '@nestjs/common';
import { VersionState } from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * Charger un import dont la version est encore un brouillon. Décrire et
 * contrôler ne se font plus une fois la version soumise : elle est figée.
 */
export async function loadDraftJob(prisma: PrismaService, id: string) {
  const job = await prisma.importJob.findUnique({
    where: { id },
    include: { version: true },
  });
  if (!job) throw new NotFoundException('Import inconnu');
  if (job.version.state !== VersionState.draft) {
    throw new ConflictException(
      'Cette version n’est plus un brouillon : elle ne se modifie plus.',
    );
  }
  return job;
}

/** Les cases de la ligne d'en-têtes. */
export async function headerOf(
  prisma: PrismaService,
  jobId: string,
  headerRow: number,
) {
  const row = await prisma.rawRow.findUnique({
    where: { jobId_rowNumber: { jobId, rowNumber: headerRow } },
  });
  return (row?.cells as string[] | undefined) ?? [];
}
