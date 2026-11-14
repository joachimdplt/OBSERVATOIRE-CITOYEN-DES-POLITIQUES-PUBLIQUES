import type { Prisma } from '../../generated/prisma/client';
import type { ReviewAction } from '../../generated/prisma/enums';

type VersionSnapshot = {
  state: string;
  submittedById: string | null;
  reviewedById: string | null;
  publishedAt: Date | null;
};

/** L'état d'une version tel que la trace le garde. */
export const snapshot = (v: VersionSnapshot) => ({
  state: v.state,
  submittedById: v.submittedById,
  reviewedById: v.reviewedById,
  publishedAt: v.publishedAt?.toISOString() ?? null,
});

/**
 * Écrire une trace de revue, dans la transaction du geste qu'elle trace : le
 * geste et sa trace réussissent ou échouent ensemble.
 */
export function recordVersionEvent(
  tx: Prisma.TransactionClient,
  event: {
    actorId: string;
    action: ReviewAction;
    versionId: string;
    before: VersionSnapshot;
    after: VersionSnapshot;
    justification?: string | null;
  },
) {
  return tx.reviewEvent.create({
    data: {
      actorId: event.actorId,
      action: event.action,
      subjectType: 'dataset_version',
      subjectId: event.versionId,
      before: snapshot(event.before),
      after: snapshot(event.after),
      justification: event.justification ?? null,
    },
  });
}
