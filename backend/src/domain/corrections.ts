/** Un extrait rangé à la main par l'équipe : le modèle s'en inspire. */
export type Correction = {
  text: string;
  code: string;
  /** Pourquoi l'équipe l'a rangé là, en une phrase. */
  reason?: string | null;
};

/** Les mots qui portent le sens d'un texte : cinq lettres au moins. */
const wordsOf = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .match(/\p{L}{5,}/gu) ?? [],
  );

/**
 * Les corrections les plus proches d'un extrait, par les mots qu'ils
 * partagent : ce sont elles que le modèle voit avant de ranger, pour ne pas
 * refaire une erreur déjà corrigée. Une correction sans mot commun n'est
 * jamais montrée.
 */
export function nearestCorrections(
  text: string,
  corrections: Correction[],
  count = 6,
): Correction[] {
  const words = wordsOf(text);
  return corrections
    .map((c) => {
      const theirs = wordsOf(c.text);
      let shared = 0;
      for (const w of theirs) if (words.has(w)) shared++;
      return { c, score: shared / Math.sqrt(theirs.size || 1) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.c);
}
