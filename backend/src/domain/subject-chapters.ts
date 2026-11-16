/** Un chapitre d'un candidat rangé dans un sujet, tel que la page le montre. */
export type SubjectChapter = {
  heading: string;
  document: { title: string; url: string };
  excerpt: { quote: string; page: number | null }[];
  /** Son rang dans son document, pour suivre l'ordre du programme. */
  position: number;
};

const prefixOf = (heading: string) =>
  heading.includes(' · ') ? heading.slice(0, heading.indexOf(' · ')) : null;

/**
 * Les chapitres d'un candidat sur un sujet, lisibles :
 * - dans l'ordre de ses documents ;
 * - un même encart répété sur plusieurs pages de son site (même titre, même
 *   texte) ne se montre qu'une fois ;
 * - les passages d'un même chapitre, rangés un par un, se lisent sous un
 *   seul titre ;
 * - les cartes d'un même tableau (« Héritage – … · Déficit public »,
 *   « Héritage – … · Dette publique ») se lisent ensemble, sous le titre
 *   qu'elles partagent, chacune avec ses lignes.
 */
export function subjectChapters(
  chapters: SubjectChapter[],
): Omit<SubjectChapter, 'position'>[] {
  const ordered = [...chapters].sort(
    (a, b) =>
      a.document.url.localeCompare(b.document.url) || a.position - b.position,
  );
  const seen = new Set<string>();
  const out: Omit<SubjectChapter, 'position'>[] = [];
  for (const c of ordered) {
    const key = `${c.heading}\n${c.excerpt.map((e) => e.quote).join('\n')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Des passages d'un même chapitre rangés un par un dans ce sujet : un
    // seul titre, et leurs citations à la suite.
    const same = out.find(
      (o) => o.document.url === c.document.url && o.heading === c.heading,
    );
    if (same) {
      for (const e of c.excerpt)
        if (!same.excerpt.some((x) => x.quote === e.quote))
          same.excerpt.push(e);
      continue;
    }
    const prefix = prefixOf(c.heading);
    const last = out.at(-1);
    if (
      prefix &&
      last &&
      last.document.url === c.document.url &&
      last.heading === prefix
    ) {
      last.excerpt.push(...c.excerpt);
      continue;
    }
    const next = ordered.find(
      (o) =>
        o !== c &&
        o.document.url === c.document.url &&
        prefix !== null &&
        prefixOf(o.heading) === prefix,
    );
    out.push({
      heading: prefix && next ? prefix : c.heading,
      document: c.document,
      excerpt: [...c.excerpt],
    });
  }
  return out;
}
