import type { ProgrammePassage } from './programme';

/** Un passage plus court ne porte pas une proposition. */
const MIN_LENGTH = 40;
/** Au-delà, un petit texte n'est plus une légende (une note, un encadré). */
const CAPTION_LENGTH = 200;

/** Un morceau de texte d'une page, tel que pdftohtml -xml le donne. */
type Piece = {
  page: number;
  top: number;
  left: number;
  width: number;
  height: number;
  size: number;
  /** La famille de la police, sans sa graisse ni son style (« Arial »). */
  family: string;
  /** Tout le morceau est en gras. */
  bold: boolean;
  text: string;
  /** Le texte tel qu'écrit, espaces compris (un sommaire aligne ses numéros). */
  raw: string;
};

/**
 * La famille d'une police, sans le préfixe de sous-ensemble ni la graisse
 * ou le style : « FKAYCI+Arial-BoldMT » et « ArialMT » sont la même famille
 * (« Arial ») ; « MinionPro-It » est « MinionPro ».
 */
export function fontFamily(name: string): string {
  let f = name.replace(/^[A-Z]{6}\+/, '');
  const suffix =
    /[-_ ,]?(Bold|Semibold|SemiBold|Demi|Black|Heavy|Medium|Light|Regular|Italic|It|Oblique|Roman|Book|MT|PS)$/i;
  while (suffix.test(f)) f = f.replace(suffix, '');
  return f;
}

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
  const families = new Map<string, string>();
  for (const m of xml.matchAll(
    /<fontspec id="(\d+)" size="([\d.]+)"(?: family="([^"]*)")?/g,
  )) {
    sizes.set(m[1], Number(m[2]));
    families.set(m[1], fontFamily(m[3] ?? ''));
  }
  const pieces: Piece[] = [];
  let page = 0;
  for (const m of xml.matchAll(
    /<page number="(\d+)"|<text top="(-?[\d.]+)" left="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" font="(\d+)">(.*?)<\/text>/g,
  )) {
    if (m[1]) {
      page = Number(m[1]);
      continue;
    }
    const raw = decode(m[7]).trim();
    const text = raw.replace(/\s+/g, ' ');
    if (!text) continue;
    pieces.push({
      page,
      top: Number(m[2]),
      left: Number(m[3]),
      width: Number(m[4]),
      height: Number(m[5]),
      size: sizes.get(m[6]) ?? 0,
      family: families.get(m[6]) ?? '',
      bold: /^(<i>)?<b>.*<\/b>(<\/i>)?$/.test(m[7].trim()),
      text,
      raw,
    });
  }
  // Un texte écrit deux fois au même endroit (une ombre, un contour) ne se
  // lit qu'une fois : on garde le morceau le plus long qui le recouvre
  // (« milliards d’euros » plutôt que « milliards » et « d’euros »).
  return pieces.filter(
    (p, i) =>
      !pieces.some(
        (q, j) =>
          j !== i &&
          q.page === p.page &&
          Math.abs(q.top - p.top) <= 2 &&
          ((p.left >= q.left - 2 && p.left + p.width <= q.left + q.width + 2) ||
            (q.text === p.text && Math.abs(q.left - p.left) <= 2)) &&
          q.text.includes(p.text.trim()) &&
          (q.text.length > p.text.length || j < i),
      ),
  );
}

const normal = (t: string) =>
  t
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/[^\p{L}#]+/gu, ' ')
    .trim();

/**
 * Les passages d'un PDF, page par page, lus avec la taille et la police de
 * leurs caractères : un titre est écrit plus grand que le texte courant, ou
 * en gras dans une autre police ; ses
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
  // Un nombre seul est un numéro de page, sauf s'il est écrit en grand : le
  // chiffre d'une infographie (« 211 » milliards d'euros) fait partie du
  // texte.
  const pieces = all.filter(
    (p) => !repeated(p) && !(/^[\d\s]+$/.test(p.text) && p.size < body * 1.15),
  );

  // La police du texte courant : celle qui porte le plus de texte à sa
  // taille.
  const fonts = new Map<string, number>();
  for (const p of all)
    if (Math.abs(p.size - body) <= 1)
      fonts.set(p.family, (fonts.get(p.family) ?? 0) + p.text.length);
  const bodyFamily = [...fonts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Un titre : plus grand que le texte courant ; ou, à peine plus petit ou
  // de même taille, tout en gras et dans une autre police que le texte
  // (un intertitre en Arial gras dans un texte en Minion). Le gras de la
  // même police reste du texte : c'est une mise en relief, pas un titre.
  // Toujours avec des lettres et pas trop long. Les grandes tailles rares
  // (un numéro de chapitre géant, une citation mise en exergue sur
  // plusieurs lignes) restent des titres seulement si elles sont courtes.
  const isHeading = (p: Piece) =>
    (p.size >= body * 1.15 ||
      (p.bold &&
        p.size >= body * 0.95 &&
        p.family !== '' &&
        p.family !== bodyFamily &&
        // Une signature (« Gabriel Attal ») n'est pas un intertitre.
        !/^\p{Lu}\p{Ll}+(?:[- ]\p{Lu}\p{Ll}+){1,2}$/u.test(p.text.trim()))) &&
    /\p{L}{2,}/u.test(p.text) &&
    p.text.length <= 140;
  if (!pieces.some(isHeading)) return null;

  // Les titres joints : des lignes consécutives de même taille, proches.
  type Block = { page: number; heading: boolean; size: number; text: string };
  const blocks: Block[] = [];
  let previous: Piece | null = null;
  for (const p of pieces) {
    const heading = isHeading(p) && !/^[\d\s,.]+$/.test(p.text);
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
    // Le chiffre d'une infographie (« 211 ») et ce qu'il compte
    // (« milliards d’euros ») se lisent ensemble, comme du texte.
    if (
      last &&
      !last.heading &&
      /^[\d\s,.]+$/.test(last.text) &&
      last.page === p.page &&
      near &&
      !/^[\p{Lu}«"“(]/u.test(p.text)
    ) {
      last.text = join(last.text, p.text);
      previous = p;
      continue;
    }
    // Un bout de titre en minuscules (« chantier » après « 1er ») complète
    // le titre qui le précède, juste au-dessus.
    if (
      heading &&
      last?.heading &&
      last.page === p.page &&
      near &&
      !/^[\p{Lu}\d«"“(]/u.test(p.text)
    ) {
      // D'une autre taille, c'est une étiquette posée à côté : ignorée.
      if (Math.abs(last.size - p.size) <= 1)
        last.text = join(last.text, p.text);
      previous = p;
      continue;
    }
    // Un grand chiffre d'infographie ouvre son propre bloc.
    const figure = /^[\d\s,.]+$/.test(p.text) && p.size >= body * 1.15;
    const afterFigure = last && /^[\d\s,.]+$/.test(last.text);
    if (
      last &&
      (!figure || afterFigure) &&
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
        // Un titre de tract finit souvent par « ! » (« sans perte de
        // salaire ! ») : seule une phrase entre guillemets est une citation.
        /[.?»":,]$/.test(b.text) ||
        /^[«"“].*!$/.test(b.text) ||
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
    // Une légende de photo ou un crédit : un texte court, nettement plus
    // petit que le texte courant. Ce ne sont pas les mots du candidat.
    if (b.size < body * 0.8 && text.length < CAPTION_LENGTH) continue;
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
