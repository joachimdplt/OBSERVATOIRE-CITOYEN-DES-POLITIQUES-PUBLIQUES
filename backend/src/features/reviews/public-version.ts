import type { Prisma } from '../../generated/prisma/client';
import { ReviewAction, VersionState } from '../../generated/prisma/enums';
import { recordVersionEvent } from './review-event';

/**
 * La version que le public voit pour un millésime d'un jeu, publiée ou
 * prépubliée, passe à « remplacée » quand une autre du même millésime la
 * remplace. Les autres millésimes restent visibles. Elle n'est pas effacée, et sa
 * trace dit par quoi elle a été remplacée.
 */
export async function supersedePublicVersion(
  tx: Prisma.TransactionClient,
  replacement: { id: string; datasetId: string; vintage: string },
  actorId: string,
) {
  const current = await tx.datasetVersion.findFirst({
    where: {
      datasetId: replacement.datasetId,
      vintage: replacement.vintage,
      state: { in: [VersionState.published, VersionState.preprint] },
      id: { not: replacement.id },
    },
  });
  if (!current) return;
  const replaced = await tx.datasetVersion.update({
    where: { id: current.id },
    data: { state: VersionState.superseded },
  });
  await recordVersionEvent(tx, {
    actorId,
    action: ReviewAction.superseded,
    versionId: current.id,
    before: current,
    after: replaced,
    justification: `Remplacée par la version « ${replacement.vintage} ».`,
  });
}
