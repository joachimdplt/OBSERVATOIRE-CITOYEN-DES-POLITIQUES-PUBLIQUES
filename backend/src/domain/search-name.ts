/**
 * Un nom ramené à sa forme de recherche : sans accents, sans majuscules, les
 * tirets et apostrophes lus comme des espaces. « Saint-Martin-d'Abbat » se
 * trouve en tapant « st martin d abbat » ou « saint martin dabbat ».
 */
export function searchForm(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`-]/g, ' ')
    .replace(/\bst\b/g, 'saint')
    .replace(/\bste\b/g, 'sainte')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Le rang d'un nom pour une saisie : 0 s'il commence par elle, 1 s'il la contient, -1 sinon. */
export function matchRank(name: string, query: string): number {
  const n = searchForm(name);
  const q = searchForm(query);
  if (!q) return -1;
  if (n.startsWith(q)) return 0;
  if (n.replace(/ /g, '').startsWith(q.replace(/ /g, ''))) return 0;
  return n.includes(q) ? 1 : -1;
}
