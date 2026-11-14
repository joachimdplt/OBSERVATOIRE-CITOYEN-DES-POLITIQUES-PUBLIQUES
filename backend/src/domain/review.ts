import { VersionState } from '../generated/prisma/enums';

export type ReviewDecision =
  { allowed: true } | { allowed: false; reason: string };

/**
 * Qui peut trancher une version. Quatre yeux : la personne qui approuve ou
 * rejette n'est jamais celle qui a soumis ou prépublié. La base tient la même
 * règle pour la publication ; ici, elle donne la raison à l'écran.
 *
 * Une version soumise s'approuve ou se rejette. Une prépublication
 * s'approuve ; la refuser viendra avec les rapports de relecture.
 */
export function canDecide(
  decision: 'approve' | 'reject',
  state: VersionState,
  submittedById: string | null,
  reviewerId: string,
): ReviewDecision {
  const open =
    state === VersionState.in_review ||
    (decision === 'approve' && state === VersionState.preprint);
  if (!open) {
    return {
      allowed: false,
      reason: 'Cette version n’attend pas de relecture.',
    };
  }
  if (submittedById === reviewerId) {
    return {
      allowed: false,
      reason:
        'Une version se relit par une autre personne que celle qui l’a soumise.',
    };
  }
  return { allowed: true };
}
