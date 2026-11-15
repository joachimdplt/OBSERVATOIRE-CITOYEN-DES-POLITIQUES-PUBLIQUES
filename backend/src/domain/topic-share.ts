/**
 * Un candidat, une voix : la place d'un sujet ne dépend pas de la longueur
 * des programmes.
 *
 * - Pour un candidat, la part d'un sujet est son nombre de passages sur ce
 *   sujet divisé par la somme de ses passages sur tous les sujets : ses parts
 *   font 1.
 * - La place globale d'un sujet est la moyenne de ces parts sur tous les
 *   candidats qui ont publié un programme : chacun compte pour la même
 *   fraction, quelle que soit la longueur de son texte.
 */
export type Counts = Map<string, Map<string, number>>; // candidat → sujet → passages

/** Les parts de chaque sujet dans le programme de chaque candidat. */
export function sharesByCandidate(counts: Counts): Counts {
  const shares: Counts = new Map();
  for (const [candidate, topics] of counts) {
    const total = [...topics.values()].reduce((n, v) => n + v, 0);
    const own = new Map<string, number>();
    if (total > 0) for (const [t, v] of topics) own.set(t, v / total);
    shares.set(candidate, own);
  }
  return shares;
}

/** La place globale de chaque sujet : la moyenne des parts, candidat par candidat. */
export function globalShares(
  shares: Counts,
  candidates: number,
): Map<string, number> {
  const out = new Map<string, number>();
  if (candidates === 0) return out;
  for (const topics of shares.values())
    for (const [t, v] of topics) out.set(t, (out.get(t) ?? 0) + v / candidates);
  return out;
}
