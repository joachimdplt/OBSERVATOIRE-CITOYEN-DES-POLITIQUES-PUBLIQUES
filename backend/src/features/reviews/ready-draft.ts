import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ImportState, VersionState } from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * Un brouillon prêt à sortir de l'équipe, pour être soumis ou prépublié :
 * contrôlé sans anomalie bloquante, avec des observations.
 */
export async function loadReadyDraft(prisma: PrismaService, id: string) {
  const version = await prisma.datasetVersion.findUnique({
    where: { id },
    include: { importJob: true, _count: { select: { observations: true } } },
  });
  if (!version) throw new NotFoundException('Version inconnue');
  if (version.state !== VersionState.draft) {
    throw new ConflictException('Seul un brouillon se soumet ou se prépublie.');
  }
  if (
    version.importJob?.state !== ImportState.validated ||
    version._count.observations === 0
  ) {
    throw new BadRequestException(
      'Contrôlez le fichier sans anomalie bloquante avant de le soumettre ou de le prépublier.',
    );
  }
  return version;
}
