import { searchForm } from './search-name';

/** Un article d'un texte déposé, mot pour mot. */
export type ArticleText = { article: string; text: string };

/**
 * Le terme surveillé que porte un titre, ou rien. La comparaison ignore
 * accents, majuscules, tirets et apostrophes, et ne retient que des mots
 * entiers : « médecin traitant » ne se trouve pas dans « médecine ».
 */
export function watchMatch(title: string, terms: string[]): string | null {
  // La ponctuation sépare les mots comme une espace : « médicaux, ».
  const words = (text: string) =>
    searchForm(text)
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const padded = ` ${words(title)} `;
  for (const term of terms) {
    const t = words(term);
    if (t && padded.includes(` ${t} `)) return term;
  }
  return null;
}

/** Un mandat dans un groupe parlementaire, du premier au dernier jour. */
export type GroupMandate = { group: string; start: string; end: string | null };

/** Le groupe d'un parlementaire à une date (AAAA-MM-JJ), ou rien s'il n'en avait pas. */
export function groupAt(mandates: GroupMandate[], date: string): string | null {
  const day = date.slice(0, 10);
  const found = mandates.find(
    (m) =>
      m.start.slice(0, 10) <= day &&
      (m.end === null || day <= m.end.slice(0, 10)),
  );
  return found?.group ?? null;
}

const BLOCK =
  /<\/?(p|div|h[1-6]|li|ul|ol|tr|td|table|section|article|blockquote|br)\b[^>]*>/gi;
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  ndash: '–',
};

const unescape = (text: string) =>
  text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#')
      return String.fromCodePoint(
        code[1].toLowerCase() === 'x'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10),
      );
    return ENTITIES[code.toLowerCase()] ?? whole;
  });

const HEADING =
  /^article\s+(1er|premier|unique|\d+(?:\s+(?:bis|ter|quater|quinquies))?)$/i;

/**
 * Les articles d'un texte déposé, tels que l'Assemblée nationale les publie
 * en données ouvertes (HTML). Le dispositif commence après le dernier
 * intitulé « Proposition de loi » ou « Projet de loi » ; chaque article court
 * jusqu'au suivant. Le texte est rendu mot pour mot : seules les balises et
 * les numéros de page disparaissent.
 */
export function readArticles(html: string): ArticleText[] {
  const flat = unescape(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
      .replace(BLOCK, '\n')
      .replace(/<[^>]+>/g, ''),
  );
  const lines = flat
    .split('\n')
    .map((l) => l.replace(/[\s\u00a0\u202f]+/g, ' ').trim())
    .filter((l) => l !== '' && !/^– \d+ –$/.test(l));

  let start = -1;
  lines.forEach((l, i) => {
    if (
      /^(proposition|projet) de loi( organique| constitutionnelle)?$/i.test(l)
    )
      start = i;
  });
  const body = lines.slice(start + 1);

  const articles: ArticleText[] = [];
  for (const line of body) {
    if (HEADING.test(line)) {
      articles.push({
        article: line.replace(/^article/i, 'Article'),
        text: '',
      });
    } else if (articles.length > 0) {
      const last = articles[articles.length - 1];
      last.text = last.text ? `${last.text}\n${line}` : line;
    }
  }
  return articles.filter((a) => a.text.length > 0);
}
