import { watchMatch } from './parliament';

/** Un passage d'un programme : sa rubrique, et son texte mot pour mot. */
export type ProgrammePassage = { heading: string; text: string };

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
