import { watchMatch } from './parliament';

/**
 * Un passage d'un programme : sa rubrique, son texte mot pour mot, et la
 * page du PDF d'où il vient (absente pour une page web).
 */
export type ProgrammePassage = { heading: string; text: string; page?: number };

/** Un passage plus court ne porte pas une proposition : un titre, une page. */
const MIN_LENGTH = 40;

/** Une ligne d'intitulé : courte, sans ponctuation finale. */
const isHeading = (line: string) =>
  line.length <= 90 &&
  !/[.;:!?,»"]$/.test(line) &&
  !/^[-•–*]\s/.test(line) &&
  /\p{L}/u.test(line);

/**
 * Les passages d'un programme lu en texte (PDF converti, page web aplatie).
 * Un passage est un paragraphe ou un élément de liste, rattaché au dernier
 * intitulé rencontré. Le texte reste mot pour mot : seuls les retours à la
 * ligne d'un même paragraphe sont joints.
 */
export function splitProgramme(text: string): ProgrammePassage[] {
  const passages: ProgrammePassage[] = [];
  let heading = '';
  let current: string[] = [];
  const flush = () => {
    const joined = current
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/(\p{L})- (\p{Ll})/gu, '$1$2')
      .trim();
    if (joined.length >= MIN_LENGTH) passages.push({ heading, text: joined });
    current = [];
  };
  const lines = text.split('\n').map((l) => l.trim());
  lines.forEach((line, i) => {
    const next = lines[i + 1] ?? '';
    // Un intitulé est seul : suivi d'une ligne vide ou d'une liste, ou en capitales.
    const alone =
      next === '' ||
      /^[-•–*]\s/.test(next) ||
      line === line.toUpperCase() ||
      (line.length <= 60 && /^\p{Lu}/u.test(next));
    if (line === '' || /^\d+$/.test(line)) {
      flush();
      return;
    }
    if (/^[-•–*]\s/.test(line)) {
      flush();
      current.push(line.replace(/^[-•–*]\s+/, ''));
      return;
    }
    if (current.length === 0 && alone && isHeading(line)) {
      heading = line;
      return;
    }
    current.push(line);
  });
  flush();
  return passages;
}

/** Un enjeu et les termes qui le reconnaissent, les mêmes pour tous les programmes. */
export type TopicTerms = { slug: string; terms: string[] };

/**
 * Les enjeux d'un passage : ceux dont un terme figure dans le texte, en mots
 * entiers. Le rangement est une recherche de termes publiés, sans jugement :
 * n'importe qui peut le refaire.
 */
export function topicsOf(
  passage: string,
  topics: TopicTerms[],
): { slug: string; term: string }[] {
  const found: { slug: string; term: string }[] = [];
  for (const t of topics) {
    const term = watchMatch(passage, t.terms);
    if (term) found.push({ slug: t.slug, term });
  }
  return found;
}

/**
 * Le texte d'un PDF converti ligne à ligne (pdftotext) remis en
 * paragraphes : les numéros de page et sauts de page qui coupent une phrase
 * sont retirés, et une ligne courte qui finit une phrase clôt son paragraphe.
 * Aucun mot n'est changé.
 */
export function pdfParagraphs(text: string): string {
  const lines = text
    .replace(/\f/g, '\n')
    .split('\n')
    .map((l) => l.trim());
  // Un numéro de page seul entre deux vides disparaît.
  const kept = lines.filter(
    (l, i) =>
      !(
        /^\d{1,3}$/.test(l) &&
        lines[i - 1] === '' &&
        (lines[i + 1] ?? '') === ''
      ),
  );
  const full = kept.filter((l) => l.length > 0).map((l) => l.length);
  const width = full.length
    ? [...full].sort((a, b) => a - b)[Math.floor(full.length * 0.75)]
    : 0;
  const out: string[] = [];
  for (let i = 0; i < kept.length; i++) {
    const line = kept[i];
    if (line === '') {
      // Un vide au milieu d'une phrase (saut de page) se referme.
      const prev = out.at(-1) ?? '';
      let j = i;
      while (j < kept.length && kept[j] === '') j++;
      const next = kept[j] ?? '';
      if (prev && !/[.!?:»;]$/.test(prev) && /^\p{Ll}/u.test(next)) {
        i = j - 1;
        continue;
      }
      if (out.at(-1) !== '') out.push('');
      continue;
    }
    out.push(line);
    const next = kept[i + 1] ?? '';
    if (
      /[.!?»]$/.test(line) &&
      line.length < width * 0.8 &&
      /^\p{Lu}|^[-•–*]/u.test(next)
    )
      out.push('');
  }
  return out.join('\n');
}

/** Un document de programme collecté : sa référence « adresse#empreinte » et sa date. */
export type ProgrammeCapture = {
  id: string;
  sourceRef: string;
  fetchedAt: Date;
};

/**
 * Les documents en vigueur : pour chaque adresse, la lecture la plus récente.
 * Une page changée chez le candidat remplace l'ancienne à l'affichage ;
 * l'ancienne reste en base.
 */
export function currentCaptures(captures: ProgrammeCapture[]): Set<string> {
  const latest = new Map<string, ProgrammeCapture>();
  for (const c of captures) {
    const url = c.sourceRef.replace(/#[0-9a-f]+$/, '');
    const seen = latest.get(url);
    if (!seen || seen.fetchedAt < c.fetchedAt) latest.set(url, c);
  }
  return new Set([...latest.values()].map((c) => c.id));
}

/** « Jean-Luc Mélenchon » se range à « Mélenchon ». */
export const surnameOf = (name: string) =>
  name.split(' ').slice(1).join(' ') || name;

/**
 * Des intitulés centrés sur des lignes : chacun prend les lignes dont il
 * occupe le milieu. Un intitulé est écrit sur l'une d'elles, ou entre deux ;
 * sa place se compte en rangs de lignes.
 */
function byCenter(
  rows: number[],
  labels: { line: number; text: string }[],
): (string | undefined)[] {
  const placed = labels
    .map((l) => {
      const same = rows.indexOf(l.line);
      const before = rows.filter((r) => r < l.line).length;
      return { text: l.text, at: same >= 0 ? same : before - 0.5 };
    })
    .sort((x, y) => x.at - y.at);
  const out: (string | undefined)[] = [];
  let start = 0;
  placed.forEach((l, i) => {
    const next = placed[i + 1];
    const end = next
      ? Math.max(
          start,
          Math.min(Math.floor(2 * l.at - start), Math.ceil(next.at) - 1),
        )
      : rows.length - 1;
    for (let k = start; k <= end; k++) out[k] = l.text;
    start = end + 1;
  });
  return out;
}

/**
 * Les lignes d'un tableau chiffré, sur une page de PDF convertie en
 * conservant la mise en page (pdftotext -layout) : chaque ligne qui porte un
 * libellé et un montant en fin de ligne devient un passage, mot pour mot
 * (« Suppression du plan vélo : 0,031 Mds€ »), sous la catégorie qui la
 * précède ou l'encadre dans la colonne de gauche. Un sous-total seul sur sa
 * ligne clôt un bloc. L'unité est lue en tête de page (« en Mds€ »).
 */
export function tableRows(page: string): ProgrammePassage[] {
  const unit =
    /\ben\s+(Mds?\s?€|M€|milliards? d['’]euros|millions? d['’]euros|€)/i.exec(
      page,
    )?.[1];
  const out: ProgrammePassage[] = [];
  // Un bloc : des lignes chiffrées et les catégories écrites à leur hauteur.
  let rows: { line: number; text: string }[] = [];
  let labels: { line: number; col: number; text: string }[] = [];
  // Un en-tête de colonne n'est pas une catégorie.
  const isHeader = (t: string) =>
    /^(cat[ée]gorie|th[èe]me|mesures?|montant|total)$/i.test(t);
  // Le titre du tableau : la première ligne écrite de la page.
  const title =
    page
      .split('\n')
      .map((l) => l.trim().split(/\s{3,}/)[0])
      .find((l) => /\p{L}{3,}/u.test(l)) ?? null;
  // Les grands groupes écrits à la marge (« Hausse recettes »), et les
  // lignes qu'ils encadrent, jusqu'au prochain total.
  let margins: { line: number; text: string }[] = [];
  let section: { line: number; index: number }[] = [];
  const closeSection = () => {
    const groups = byCenter(
      section.map((r) => r.line),
      margins,
    );
    section.forEach((r, k) => {
      const group = groups[k];
      if (group) out[r.index].heading = `${group} · ${out[r.index].heading}`;
    });
    margins = [];
    section = [];
  };
  const flush = (subtotal?: { line: number; amount: string }) => {
    // Les catégories d'un bloc, hors la colonne des grands groupes
    // (« Baisse dépenses ») écrite nettement plus à gauche.
    const deepest = Math.max(...labels.map((l) => l.col), 0);
    const own = labels.filter((l) => l.col >= deepest - 15);
    margins.push(...labels.filter((l) => l.col < deepest - 15));
    const headingOf = byCenter(
      rows.map((r) => r.line),
      own,
    );
    rows.forEach((r, k) => {
      out.push({ heading: headingOf[k] ?? title ?? '', text: r.text });
      section.push({ line: r.line, index: out.length - 1 });
    });
    // Le sous-total d'un bloc chiffre sa dernière catégorie.
    const last = headingOf.at(-1);
    if (subtotal && last && rows.length) {
      out.push({
        heading: last,
        text: `${last} : ${subtotal.amount}${unit ? ` ${unit}` : ''}`,
      });
      section.push({ line: subtotal.line, index: out.length - 1 });
    }
    rows = [];
    labels = [];
  };
  page.split('\n').forEach((line, index) => {
    const segments = [...line.matchAll(/\S(?:.*?\S)?(?=\s{3,}|\s*$)/g)].map(
      (m) => ({ col: m.index ?? 0, text: m[0].trim() }),
    );
    if (segments.length === 0) return;
    const last = segments.at(-1)!;
    const amount = /^-?\d{1,3}(?:\s?\d{3})*(?:[.,]\d+)?$/.test(last.text);
    if (amount && segments.length === 1) {
      flush({ line: index, amount: last.text }); // un sous-total clôt un bloc
      return;
    }
    // Un total général, écrit « Total » à la marge.
    if (amount && segments.length === 2 && /^total$/i.test(segments[0].text)) {
      flush();
      closeSection();
      out.push({
        heading: title ?? '',
        text: `${segments[0].text} : ${last.text}${unit ? ` ${unit}` : ''}`,
      });
      return;
    }
    const texts = segments.slice(0, amount ? -1 : undefined);
    if (!amount) {
      // Une catégorie seule sur sa ligne, dans la colonne de gauche.
      if (texts.length === 1 && last.text.length < 40 && !isHeader(last.text))
        labels.push({ line: index, col: last.col, text: last.text });
      return;
    }
    // Le libellé de la mesure : le plus long des textes de la ligne.
    const measure = texts.reduce((a, b) =>
      b.text.length > a.text.length ? b : a,
    );
    // Une mesure commence par une majuscule : les fragments d'infographie
    // (« prestations de solidarité. ») ne sont pas des lignes de tableau.
    if (measure.text.length < 12 || !/^\p{Lu}/u.test(measure.text)) return;
    // La catégorie de la ligne : le texte court le plus proche du libellé.
    const category = texts
      .filter((t) => t !== measure && t.text.length < 40 && !isHeader(t.text))
      .at(-1);
    if (category) {
      labels.push({ line: index, col: category.col, text: category.text });
      // Un grand groupe écrit sur la même ligne, nettement plus à gauche.
      for (const t of texts)
        if (t !== measure && t !== category && t.col < category.col - 15)
          margins.push({ line: index, text: t.text });
    }
    rows.push({
      line: index,
      text: `${measure.text} : ${last.text}${unit ? ` ${unit}` : ''}`,
    });
  });
  flush();
  closeSection();
  // Un tableau annonce son unité, ou compte au moins dix lignes.
  return unit || out.length >= 10 ? out : [];
}

/** Un montant seul : « + 32,4 », « -4,7% », « 0,496 », « - 57 Mds€ ». */
const FIGURE = /^([+\-−]?\s*\d+(?:[.,]\d+)?)\s*(%|Mds?\s?€|Md€|M€|€)?$/;
const UNIT = /^(Mds?\s?€|Md€|M€|€)$/;
/** Une ligne qui finit par son montant : « général.     3,2 », « ÉCONOMIES  + 50 ». */
const ENDING = /^(.*\p{L}.*?)\s{2,}([+\-−]?\s?\d+(?:[.,]\d+)?)$/u;
/** La fin d'une phrase commencée plus haut : « 2026)     1,02 ». */
const CONTINUED = /^(.*\S)\s{2,}([+\-−]?\s?\d+(?:[.,]\d+)?)$/;
/** Une année seule n'est pas un montant. */
const YEAR = /^(19|20)\d\d$/;

/** Un titre de carte en capitales s'écrit en minuscules, à l'initiale près. */
const sentenceCase = (title: string) =>
  title === title.toUpperCase()
    ? title.charAt(0) + title.slice(1).toLowerCase()
    : title;

const isFigured = (line: string) =>
  (FIGURE.test(line) && !YEAR.test(line)) || ENDING.test(line);

/**
 * Les cartes d'une infographie, sur une page de PDF convertie en conservant
 * la mise en page : les cartes sont posées côte à côte, séparées par des
 * colonnes vides. Chaque carte se lit seule, de haut en bas : son titre en
 * capitales, son montant total, puis chaque ligne et son montant
 * (« Baisse des subventions aux associations… : 3,2 Mds€ »), mot pour mot.
 * Un grand chiffre sans titre prend pour libellé la phrase écrite dessous
 * (« Baisses sur des mauvaises dépenses : -57 Mds€ »).
 */
export function cardRows(page: string): ProgrammePassage[] {
  // Les rangées de cartes : séparées par au moins trois lignes vides.
  const bands: string[][] = [];
  let band: string[] = [];
  let blanks = 0;
  for (const line of page.split('\n')) {
    if (!line.trim()) {
      blanks++;
      if (blanks >= 3 && band.length) {
        bands.push(band);
        band = [];
      }
      continue;
    }
    if (blanks && band.length) band.push('');
    blanks = 0;
    band.push(line);
  }
  if (band.length) bands.push(band);

  const out: ProgrammePassage[] = [];
  for (const band of bands) {
    // Un intitulé de section au-dessus des cartes (« RECETTES FISCALES »),
    // seul sur sa ligne et suivi d'une ligne vide : il chapeaute les cartes
    // écrites sous lui.
    let rows = band;
    let sections: { col: number; text: string }[] = [];
    const first = [...(band[0] ?? '').matchAll(/\S(?:.*?\S)?(?=\s{3,}|\s*$)/g)];
    if (
      band[1] === '' &&
      first.length > 0 &&
      first.every((m) => m[0] === m[0].toUpperCase() && /\p{L}{3,}/u.test(m[0]))
    ) {
      sections = first.map((m) => ({ col: m.index ?? 0, text: m[0] }));
      rows = band.slice(2);
    }
    // Les colonnes : séparées par au moins deux caractères vides sur toute
    // la hauteur de la rangée.
    const width = Math.max(...rows.map((r) => r.length));
    const used = Array.from({ length: width }, (_, x) =>
      rows.some((r) => r[x] !== undefined && r[x] !== ' '),
    );
    let columns: [number, number][] = [];
    let start = -1;
    for (let x = 0; x <= width; x++) {
      const filled = x < width && used[x];
      if (filled && start < 0) start = x;
      if (!filled && start >= 0 && !used[x + 1]) {
        columns.push([start, x]);
        start = -1;
      }
    }
    const cut = ([from, to]: [number, number]) =>
      rows.map((r) => r.slice(from, to).trim());
    // Une colonne de montants seuls appartient à la carte de sa gauche,
    // dont elle chiffre les lignes.
    const amounts: [number, number][] = [];
    for (const column of columns) {
      const lines = cut(column).filter(Boolean);
      const previous = amounts.at(-1);
      if (
        previous &&
        lines.every((l) => UNIT.test(l) || (FIGURE.test(l) && !YEAR.test(l)))
      )
        previous[1] = column[1];
      else amounts.push([...column]);
    }
    columns = amounts;
    // Une colonne de libellés sans aucun montant appartient à la carte de
    // sa droite, où sont écrits les montants.
    const merged: [number, number][] = [];
    for (let i = columns.length - 1; i >= 0; i--) {
      const next = merged[0];
      if (next && !cut(columns[i]).some(isFigured))
        merged[0] = [columns[i][0], next[1]];
      else merged.unshift(columns[i]);
    }
    columns = merged;
    // Une rangée d'une seule colonne est du texte suivi, pas des cartes.
    if (columns.length < 2) continue;
    for (const column of columns) {
      const section = sections.filter((h) => h.col <= column[0] + 8).at(-1);
      out.push(
        ...readCard(cut(column)).map((c) =>
          section
            ? {
                ...c,
                heading: [sentenceCase(section.text), c.heading]
                  .filter(Boolean)
                  .join(' · '),
              }
            : c,
        ),
      );
    }
  }
  return out;
}

/** Une carte, lue de haut en bas. */
function readCard(lines: string[]): ProgrammePassage[] {
  const out: ProgrammePassage[] = [];
  let title: string[] = [];
  let total: { value: string; unit?: string } | null = null;
  let headline: { value: string; unit?: string } | null = null;
  let unit: string | undefined;
  let totalUnit: string | undefined;
  let text: string[] = [];
  const said = (words: string[]) => words.join(' ').replace(/\s+/g, ' ').trim();
  const amount = (value: string, own?: string) =>
    `${value.replace(/\s+/g, '')}${(own ?? unit) ? ` ${own ?? unit}` : ''}`;
  const item = (label: string, value: string, own?: string) => {
    // Des chiffres de graphique superposés ne font pas un libellé.
    if (!/\p{L}{3,}/u.test(label.replace(/Mds?|Md/g, ''))) {
      text = [];
      return;
    }
    out.push({
      heading: sentenceCase(said(title)),
      text: `${label} : ${amount(value, own)}`,
    });
    text = [];
  };
  // Un grand chiffre sans titre : son libellé est la phrase écrite dessous.
  // Une phrase chiffrée dessous n'est pas son libellé : le chiffre est alors
  // le total de la carte.
  const closeHeadline = () => {
    if (!headline) return;
    const label = said(text);
    if (label && !/\d/.test(label))
      item(sentenceCase(label), headline.value, headline.unit);
    else if (title.length && !total) total = headline;
    headline = null;
  };
  const writeTotal = () => {
    if (!total || !title.length) return;
    // Le total en tête de la carte, avec l'unité écrite sous lui.
    out.unshift({
      heading: sentenceCase(said(title)),
      text: `${sentenceCase(said(title))} : ${amount(total.value, total.unit ?? totalUnit)}`,
    });
  };
  for (const line of lines) {
    if (!line || /^\(autres postes/i.test(line)) continue;
    if (UNIT.test(line)) {
      if (total && !totalUnit && !out.length) totalUnit = line;
      unit = line;
      continue;
    }
    const ending =
      ENDING.exec(line) ?? (text.length ? CONTINUED.exec(line) : null);
    if (ending) {
      closeHeadline();
      item(sentenceCase(said([...text, ending[1]])), ending[2]);
      continue;
    }
    const figure = YEAR.test(line) ? null : FIGURE.exec(line);
    if (figure) {
      const [, value, own] = figure;
      if (text.length && !headline) item(said(text), value, own);
      else if (own || !title.length || total) {
        // Un grand chiffre avec son unité : son libellé est écrit dessous.
        closeHeadline();
        headline = { value, unit: own };
      } else {
        total = { value, unit: own };
      }
      continue;
    }
    // Un titre : en capitales (ou une précision entre parenthèses), avant
    // tout montant de la carte.
    const caps =
      line === line.toUpperCase() &&
      (/\p{L}/u.test(line) || /^\(.*\)$/.test(line));
    if (caps && !text.length && !total && !headline) {
      title.push(line);
      continue;
    }
    if (caps && headline) {
      closeHeadline();
      writeTotal();
      title = [line];
      total = null;
      continue;
    }
    text.push(line);
  }
  closeHeadline();
  writeTotal();
  // Une phrase chiffrée restée seule se garde telle quelle.
  const rest = said(text);
  if (/\d/.test(rest) && /\p{L}{3,}/u.test(rest.replace(/Mds?|Md/g, '')))
    out.push({ heading: sentenceCase(said(title)), text: rest });
  return out;
}
