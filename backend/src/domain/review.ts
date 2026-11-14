import { VersionState } from '../generated/prisma/enums';

export type ReviewDecision =
  { allowed: true } | { allowed: false; reason: string };

/**
 * Qui peut trancher une version soumise. Quatre yeux : la personne qui
 * approuve ou rejette n'est jamais celle qui a soumis. La base tient la même
 * règle pour la publication ; ici, elle donne la raison à l'écran.
 */
export function canDecide(
  state: VersionState,
  submittedById: string | null,
  reviewerId: string,
): ReviewDecision {
  if (state !== VersionState.in_review) {
    return {
      allowed: false,
      reason: 'Cette version n’est pas soumise à relecture.',
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
