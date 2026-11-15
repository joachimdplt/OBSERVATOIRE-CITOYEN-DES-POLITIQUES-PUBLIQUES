import type { ProgrammePassage } from './programme';

/** Un passage plus court ne porte pas une proposition. */
const MIN_LENGTH = 40;

/** Un morceau de texte d'une page, tel que pdftohtml -xml le donne. */
type Piece = {
  page: number;
  top: number;
  left: number;
  height: number;
  size: number;
  text: string;
};

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));

/** Les morceaux de texte d'un PDF converti par pdftohtml -xml, dans l'ordre. */
export function piecesOf(xml: string): Piece[] {
  const sizes = new Map<string, number>();
  for (const m of xml.matchAll(/<fontspec id="(\d+)" size="([\d.]+)"/g))
    sizes.set(m[1], Number(m[2]));
  const pieces: Piece[] = [];
  let page = 0;
  for (const m of xml.matchAll(
    /<page number="(\d+)"|<text top="(-?[\d.]+)" left="(-?[\d.]+)" width="[\d.]+" height="([\d.]+)" font="(\d+)">(.*?)<\/text>/g,
  )) {
    if (m[1]) {
      page = Number(m[1]);
      continue;
    }
    const text = decode(m[6]).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    pieces.push({
      page,
      top: Number(m[2]),
      left: Number(m[3]),
      height: Number(m[4]),
      size: sizes.get(m[5]) ?? 0,
      text,
    });
  }
  return pieces;
}

const normal = (t: string) =>
  t
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/[^\p{L}#]+/gu, ' ')
    .trim();

/**
 * Les passages d'un PDF, page par page, lus avec la taille de leurs
 * caractères : un titre est écrit plus grand que le texte courant ; ses
 * lignes se joignent ; un en-tête ou un pied de page répété de page en page
 * n'est pas un titre. Chaque paragraphe se range sous le dernier titre lu.
 * Le texte reste mot pour mot. Rend `null` quand le document n'a pas de
 * titres reconnaissables par leur taille.
 */
export function readPdfLayout(xml: string): ProgrammePassage[][] | null {
  const all = piecesOf(xml);
  if (all.length === 0) return null;
  const pages = Math.max(...all.map((p) => p.page));

  // Le texte courant : la taille qui porte le plus de caractères.
  const weight = new Map<number, number>();
  for (const p of all)
    weight.set(p.size, (weight.get(p.size) ?? 0) + p.text.length);
  const body = [...weight.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // Les en-têtes et pieds de page : le même texte, au même endroit, sur au
  // moins trois pages (ou un tiers des pages d'un document court).
  const seen = new Map<string, Set<number>>();
  for (const p of all) {
    const key = `${Math.round(p.top / 10)}|${normal(p.text)}`;
    if (!seen.has(key)) seen.set(key, new Set());
    seen.get(key)!.add(p.page);
  }
  const repeated = (p: Piece) =>
    (seen.get(`${Math.round(p.top / 10)}|${normal(p.text)}`)?.size ?? 0) >= 3;
  const pieces = all.filter((p) => !repeated(p) && !/^[\d\s]+$/.test(p.text));

  // Un titre : plus grand que le texte courant, avec des lettres, pas trop
  // long. Les grandes tailles rares (un numéro de chapitre géant, une
  // citation mise en exergue sur plusieurs lignes) restent des titres
  // seulement si elles sont courtes.
  const isHeading = (p: Piece) =>
    p.size >= body * 1.15 && /\p{L}{2,}/u.test(p.text) && p.text.length <= 140;
  if (!pieces.some(isHeading)) return null;

  // Les titres joints : des lignes consécutives de même taille, proches.
  type Block = { page: number; heading: boolean; size: number; text: string };
  const blocks: Block[] = [];
  let previous: Piece | null = null;
  for (const p of pieces) {
    const heading = isHeading(p);
    const last = blocks.at(-1);
    const near =
      previous &&
      previous.page === p.page &&
      p.top - previous.top >= -2 &&
      p.top - previous.top <=
        Math.max(previous.height, p.height) * (heading ? 1.9 : 1.45);
    // Une puce ouvre un nouveau paragraphe.
    const bullet = /^[•●▪■◆✓►→–-]\s/.test(p.text);
    const sameLine =
      previous &&
      previous.page === p.page &&
      Math.abs(p.top - previous.top) <= 2;
    // Un bout de titre en minuscules (« chantier » après « 1er ») complète
    // le titre qui le précède.
    if (
      heading &&
      last?.heading &&
      last.page === p.page &&
      !/^[\p{Lu}\d«"“(]/u.test(p.text)
    ) {
      // D'une autre taille, c'est une étiquette posée à côté : ignorée.
      if (Math.abs(last.size - p.size) <= 1)
        last.text = join(last.text, p.text);
      previous = p;
      continue;
    }
    if (
      last &&
      last.heading === heading &&
      (last.page === p.page || (!heading && continues(last.text, p))) &&
      (heading
        ? Math.abs(last.size - p.size) <= 1 && (near || sameLine)
        : !bullet && (near || sameLine || continues(last.text, p)))
    ) {
      last.text = join(last.text, p.text);
    } else {
      blocks.push({ page: p.page, heading, size: p.size, text: p.text });
    }
    previous = p;
  }

  // Un titre trop long pour en être un (une citation en exergue) se lit
  // comme un paragraphe.
  // Un intitulé répété dans tout le document (« Nous voulons : ») annonce
  // une liste : ce n'est pas un titre.
  const count = new Map<string, number>();
  for (const b of blocks)
    if (b.heading)
      count.set(normal(b.text), (count.get(normal(b.text)) ?? 0) + 1);
  for (const b of blocks)
    if (
      b.heading &&
      (b.text.length > 160 ||
        /[.!?»":]$/.test(b.text) ||
        (count.get(normal(b.text)) ?? 0) >= 3 ||
        !/^[\p{Lu}\d«"“(]/u.test(b.text))
    )
      b.heading = false;

  const out: ProgrammePassage[][] = Array.from({ length: pages }, () => []);
  // Les titres en cours, du plus grand au plus petit : le plus fin nomme
  // la rubrique.
  let stack: { size: number; text: string }[] = [];
  for (const b of blocks) {
    if (b.heading) {
      stack = stack.filter((h) => h.size > b.size + 1);
      stack.push({ size: b.size, text: b.text });
      continue;
    }
    // La puce est une marque de mise en page, pas un mot du texte.
    const text = b.text.replace(/^[•●▪■◆✓►→–-]\s+/, '').trim();
    if (text.length < MIN_LENGTH) continue;
    out[b.page - 1].push({ heading: stack.at(-1)?.text ?? '', text });
  }
  return out;
}

/** Deux lignes d'un même paragraphe se joignent ; un mot coupé se recolle. */
function join(a: string, b: string) {
  if (/\p{L}-$/u.test(a) && /^\p{Ll}/u.test(b)) return a.slice(0, -1) + b;
  return `${a} ${b}`;
}

/**
 * Une ligne qui reprend en haut d'une autre colonne continue le paragraphe
 * quand le précédent ne finissait pas sa phrase.
 */
function continues(previous: string, p: Piece) {
  return !/[.!?:»"]$/.test(previous) && /^\p{Ll}/u.test(p.text);
}
