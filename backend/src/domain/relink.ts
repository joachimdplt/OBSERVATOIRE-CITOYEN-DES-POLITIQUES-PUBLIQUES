/**
 * Un rangement suit ses passages quand son document est relu : la
 * relecture peut changer les titres (un intertitre enfin reconnu) et la
 * coupe des paragraphes, pas les mots du candidat. On retrouve donc les
 * passages d'un rangement par leur texte, dans la nouvelle lecture.
 */

/** Le texte comparable : minuscules, sans accents ni ponctuation. */
export function comparable(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Un morceau plus court ne suffit pas à dire que deux textes se recouvrent. */
const MIN_OVERLAP = 30;

export type ReadPassage = { article: string; position: number; quote: string };

/**
 * Les passages de la nouvelle lecture qui reprennent le texte d'un
 * rangement : ceux dont le texte est contenu dans l'ancien, ou le
 * contiennent. Ils sont pris sous un seul titre, celui qui en reprend le
 * plus ; rend `null` si rien ne se retrouve.
 */
export function relink(
  previous: string[],
  next: ReadPassage[],
): {
  article: string;
  passages: { position: number; covered: number }[];
} | null {
  const old = previous.map(comparable).filter((t) => t.length > 0);
  if (old.length === 0) return null;
  const whole = old.join(' ');
  const found = next.flatMap((p) => {
    const t = comparable(p.quote);
    if (t.length < MIN_OVERLAP) return [];
    if (whole.includes(t)) return [{ ...p, covered: t.length }];
    const inside = old.find((o) => o.length >= MIN_OVERLAP && t.includes(o));
    return inside ? [{ ...p, covered: inside.length }] : [];
  });
  if (found.length === 0) return null;
  const weight = new Map<string, number>();
  for (const f of found)
    weight.set(f.article, (weight.get(f.article) ?? 0) + f.covered);
  const [article] = [...weight.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    article,
    passages: found
      .filter((f) => f.article === article)
      .map((f) => ({ position: f.position, covered: f.covered }))
      .sort((a, b) => a.position - b.position),
  };
}

/** Le même texte, à la ponctuation et aux espaces près. */
export const sameText = (a: string[], b: string[]) =>
  comparable(a.join(' ')) === comparable(b.join(' '));

/** La part de mots communs à partir de laquelle deux libellés sont la même
 * mesure (indice de Jaccard sur les mots de trois lettres et plus). */
const SAME_MEASURE = 0.6;

/**
 * Une même mesure écrite deux fois dans un document (un résumé illustré,
 * puis le tableau détaillé en annexe) : elle ne se range qu'une fois, à sa
 * dernière occurrence, celle du tableau qui vient après le résumé. On
 * compare les mots du libellé, sans son montant (« Suppression du visa pour
 * soins. : 1 Mds€ » et « Suppression visa pour soins : 1,000 Mds€ »), sur
 * deux pages différentes. Rend les rangs des occurrences écartées.
 */
const AMOUNT = /\s*:\s*[-+−]?\s*[\d\s,.]+\s*(%|Mds?\s?€|Md€|M€|€)?\s*$/u;

/**
 * Le total d'une case de tableau, qui répète son titre (« Justice
 * économique : 0,5 Md€ » sous « Justice économique ») : un chiffre, pas une
 * mesure. Il reste affiché ; il ne se range pas.
 */
export function isCardTotal(quote: string, heading: string): boolean {
  if (!AMOUNT.test(quote)) return false;
  const title = heading.split('·').pop() ?? heading;
  return comparable(quote.replace(AMOUNT, '')) === comparable(title);
}

export function earlierDuplicates(
  passages: { position: number; quote: string; page?: number | null }[],
): Set<number> {
  // Les mots qui portent le sens du libellé, sans son montant.
  const words = (q: string) =>
    new Set(
      comparable(q.replace(AMOUNT, ''))
        .split(' ')
        .filter((w) => w.length >= 3),
    );
  const read = passages.map((p) => ({ ...p, words: words(p.quote) }));
  const out = new Set<number>();
  for (const a of read) {
    if (a.words.size < 3) continue;
    const later = read.some((b) => {
      if (b.position <= a.position || b.words.size < 3) return false;
      // Deux occurrences sur la même page sont deux mesures voisines
      // (« suppression de la CFE », « suppression de la CVAE »).
      if (a.page != null && a.page === b.page) return false;
      const shared = [...a.words].filter((w) => b.words.has(w)).length;
      return shared / (a.words.size + b.words.size - shared) >= SAME_MEASURE;
    });
    if (later) out.add(a.position);
  }
  return out;
}
