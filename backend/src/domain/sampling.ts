/**
 * Combien de cartes vérifier, et ce que disent les cartes vérifiées.
 *
 * La marge d'erreur d'un taux mesuré sur n cartes, à 95 % :
 * ± 1,96 × √( p × (1 − p) / n ). Sans rien savoir du taux, on prend le cas
 * le plus défavorable, p = 0,5. Quand le candidat a peu de rangements, la
 * correction de population finie réduit le nombre de cartes : vérifier 16
 * rangements sur 16, c'est tout savoir.
 */

/** La marge visée par défaut : ± 10 points. */
export const DEFAULT_MARGIN = 0.1;

const Z = 1.96;

/** Le nombre de cartes à vérifier pour une population de rangements. */
export function sampleSize(population: number, margin = DEFAULT_MARGIN) {
  if (population <= 0) return 0;
  const infinite = (Z * Z * 0.25) / (margin * margin);
  const finite = infinite / (1 + (infinite - 1) / population);
  return Math.min(population, Math.ceil(finite));
}

export type Rate =
  | { measured: false }
  | {
      measured: true;
      right: number;
      total: number;
      rate: number;
      low: number;
      high: number;
    };

/**
 * Le taux de rangements justes et son intervalle à 95 %. Quand tous les
 * rangements sont justes (ou tous faux), la formule ne vaut plus : on prend
 * la règle de trois, l'erreur peut aller jusqu'à 3 / n. Quand toute la
 * population est vérifiée, il n'y a plus de marge.
 */
export function rateOf(
  right: number,
  total: number,
  population?: number,
): Rate {
  if (total === 0) return { measured: false };
  const rate = right / total;
  if (population !== undefined && total >= population)
    return { measured: true, right, total, rate, low: rate, high: rate };
  if (right === total)
    return {
      measured: true,
      right,
      total,
      rate,
      low: Math.max(0, 1 - 3 / total),
      high: 1,
    };
  if (right === 0)
    return {
      measured: true,
      right,
      total,
      rate,
      low: 0,
      high: Math.min(1, 3 / total),
    };
  // Quand une bonne part de la population est vérifiée, la marge rétrécit
  // d'autant (correction de population finie).
  const finite =
    population !== undefined && population > 1
      ? Math.sqrt((population - total) / (population - 1))
      : 1;
  const m = Z * Math.sqrt((rate * (1 - rate)) / total) * finite;
  return {
    measured: true,
    right,
    total,
    rate,
    low: Math.max(0, rate - m),
    high: Math.min(1, rate + m),
  };
}
