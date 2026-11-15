/** Un passage tel qu'il se lit, dans l'ordre du programme. */
export type ReadingPassage = {
  heading: string;
  page: number | null;
  document: { title: string; url: string };
};

/** Un chapitre de lecture : ce qui se charge d'un coup quand on y arrive. */
export type ReadingChapter = {
  /** Son nom dans le panneau : son titre, sa page, ou son document. */
  label: string;
  /** Le document d'où il vient. */
  title: string;
  url: string;
  /** Le rang de son premier passage, et leur nombre. */
  start: number;
  count: number;
  /** Ses pages, quand il vient d'un PDF. */
  from: number | null;
  to: number | null;
  /** Les rubriques qu'il contient, dans l'ordre, chacune une fois. */
  headings: string[];
};

/** « LR_Produire_Plus_LIVRET.pdf » se lit « LR Produire Plus LIVRET ». */
export const documentName = (title: string) =>
  /\.pdf$/i.test(title)
    ? title
        .replace(/\.pdf$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim()
    : title;

/**
 * Les chapitres de lecture d'un programme, comme il est écrit : par
 * document, ou par ses propres titres quand le candidat ne publie qu'un
 * document ou deux ; sans titre, par page du PDF. Le site charge chaque
 * chapitre quand le lecteur s'en approche.
 */
export function readingChapters(passages: ReadingPassage[]): ReadingChapter[] {
  const byHeading = new Set(passages.map((p) => p.document.url)).size < 3;
  // Un document qui a des titres : un passage sans titre reste dans le
  // chapitre en cours. Seul un PDF sans aucun titre se lit page par page.
  const titled = new Set(
    passages
      .filter((p) => p.heading && p.heading !== p.document.title)
      .map((p) => p.document.url),
  );
  const chapters: ReadingChapter[] = [];
  passages.forEach((p, i) => {
    const heading = p.heading === p.document.title ? '' : p.heading;
    let c = chapters.at(-1);
    const inChapter = c?.url === p.document.url && titled.has(p.document.url);
    const label = !byHeading
      ? documentName(p.document.title)
      : heading ||
        (inChapter && c
          ? c.label
          : p.page
            ? `Page ${p.page}`
            : documentName(p.document.title));
    if (!c || c.url !== p.document.url || (byHeading && c.label !== label)) {
      c = {
        label,
        title: p.document.title,
        url: p.document.url,
        start: i,
        count: 0,
        from: null,
        to: null,
        headings: [],
      };
      chapters.push(c);
    }
    c.count++;
    if (p.page) {
      c.from = c.from === null ? p.page : Math.min(c.from, p.page);
      c.to = c.to === null ? p.page : Math.max(c.to, p.page);
    }
    if (heading && c.headings.at(-1) !== heading) c.headings.push(heading);
  });
  return chapters;
}
