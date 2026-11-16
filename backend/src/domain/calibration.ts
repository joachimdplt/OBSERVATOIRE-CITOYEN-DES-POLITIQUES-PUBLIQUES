/**
 * Quand le classeur apprend sur les verdicts de personnes, et à partir de
 * quelle confiance il range seul. Deux règles, toutes deux mesurées sur des
 * verdicts de personnes, jamais sur des décisions d'assistant.
 */

/** Le nombre de rangements vérifiés par une personne au-delà duquel le
 * classeur n'apprend plus que sur eux. */
export const MIN_PERSON_TRAIN = 300;

/** Le nombre de candidats différents qu'ils doivent couvrir : en dessous, le
 * classeur apprendrait les tournures de quelques candidats, pas les sujets. */
export const MIN_PERSON_CANDIDATES = 4;

/** Le seuil de confiance tant qu'aucune mesure ne l'a fixé. */
export const DEFAULT_SURE = 0.7;

/** La justesse que le bas de la marge doit atteindre pour ranger seul. */
export const TARGET = 0.9;

/** Le nombre minimal de chapitres au-dessus d'un seuil pour le juger. */
export const MIN_SURE = 30;

const Z = 1.96;

/** Sur quoi le classeur apprend : les verdicts de personnes, quand il y en
 * a assez et sur assez de candidats ; sinon tout ce qui est affiché. */
export function trainingSource(persons: number, candidates: number) {
  return persons >= MIN_PERSON_TRAIN && candidates >= MIN_PERSON_CANDIDATES
    ? ('person' as const)
    : ('displayed' as const);
}

/** Le bas de l'intervalle à 95 % d'un taux ; règle de trois quand tout est
 * juste, la formule ne valant plus. */
export function lowerBound(right: number, total: number) {
  if (total === 0) return 0;
  if (right === total) return Math.max(0, 1 - 3 / total);
  const p = right / total;
  return Math.max(0, p - Z * Math.sqrt((p * (1 - p)) / total));
}

export type Calibrated = {
  threshold: number;
  right: number;
  total: number;
  low: number;
};

/**
 * Le plus petit seuil de confiance (de 0,5 à 0,95, par pas de 0,05) où le
 * classeur, testé sur des chapitres jamais vus, est juste au moins 90 fois
 * sur 100 en bas de sa marge, sur au moins 30 chapitres. `null` si aucun
 * seuil n'y arrive : le classeur ne range alors jamais seul.
 */
export function chooseThreshold(
  results: { confidence: number; right: boolean }[],
): Calibrated | null {
  for (let step = 10; step <= 19; step++) {
    const threshold = step / 20;
    const kept = results.filter((r) => r.confidence >= threshold);
    if (kept.length < MIN_SURE) return null;
    const right = kept.filter((r) => r.right).length;
    const low = lowerBound(right, kept.length);
    if (low >= TARGET) return { threshold, right, total: kept.length, low };
  }
  return null;
}
