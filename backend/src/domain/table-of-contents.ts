/** Un chapitre annoncé par le sommaire d'un document, et sa page de début. */
export type Chapter = { title: string; page: number };

/** Le sommaire lu : ses chapitres, et les pages qu'il occupe. */
export type Contents = { chapters: Chapter[]; pages: number[] };

/** Une ligne de sommaire : un titre, des espaces, un numéro de page. */
const ENTRY = /^\s*(?:\d{1,3}\.?\s+)?(\S.*?\S)\s{2,}(\d{1,3})\s*$/;

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’']/g, "'")
    .toLowerCase()
    .replace(/[^\p{L}\d']+/gu, ' ')
    .trim();

/**
 * Les chapitres d'un PDF, lus dans son propre sommaire (pdftotext -layout,
 * page par page) : chaque ligne « 9 Sanctuariser l'accès à l'eau potable
 * 40 » donne un titre, mot pour mot, et sa page. Un titre sur deux lignes se
 * rejoint. La page imprimée peut différer de la page du fichier : le
 * décalage se vérifie en cherchant les titres dans le texte. Rend une liste
 * vide sans sommaire d'au moins cinq chapitres retrouvés.
 */
export function tableOfContents(pages: string[]): Contents {
  const none: Contents = { chapters: [], pages: [] };
  const entries: Chapter[] = [];
  const tocPages: number[] = [];
  // Le sommaire est au début du document.
  const head = pages.slice(0, Math.max(6, Math.ceil(pages.length / 5)));
  head.forEach((page, index) => {
    const found: Chapter[] = [];
    let pending = '';
    for (const line of page.split('\n')) {
      const m = ENTRY.exec(line.replace(/\t/g, '    '));
      if (m) {
        const title = `${pending} ${m[1]}`.replace(/\s+/g, ' ').trim();
        found.push({ title, page: Number(m[2]) });
        pending = '';
        continue;
      }
      // La première ligne d'un titre long, sans numéro de page, en retrait.
      const text = line.trim();
      pending =
        /^\d{1,3}\s+\p{Lu}/u.test(text) && !/\s{2,}\d{1,3}$/.test(text)
          ? text.replace(/^\d{1,3}\s+/, '')
          : '';
    }
    // Une page de sommaire : au moins cinq entrées, aux pages croissantes,
    // qui renvoient plus loin que la page du sommaire.
    if (found.length >= 5 && found.at(-1)!.page > index + 1) {
      entries.push(...found.filter((e) => e.page > index + 1));
      tocPages.push(index + 1);
    }
  });
  if (entries.length < 5) return none;

  // Le décalage entre page imprimée et page du fichier : lu dans les numéros
  // imprimés en pied de page ; à défaut, celui qui retrouve le plus de
  // titres sur leur page.
  const gaps = new Map<number, number>();
  pages.forEach((page, index) => {
    const last = page.trim().split('\n').at(-1)?.trim() ?? '';
    if (/^\d{1,3}$/.test(last)) {
      const gap = index + 1 - Number(last);
      gaps.set(gap, (gaps.get(gap) ?? 0) + 1);
    }
  });
  const footer = [...gaps.entries()].sort((x, y) => y[1] - x[1])[0];
  const texts = pages.map(normal);
  const at = (e: Chapter, shift: number) =>
    texts[e.page - 1 + shift]?.includes(normal(e.title).slice(0, 40)) ?? false;
  let shift = 0;
  if (footer && footer[1] >= 5) shift = footer[0];
  else {
    let best = { shift: 0, hits: -1 };
    for (let s = -6; s <= 6; s++) {
      const hits = entries.filter((e) => at(e, s)).length;
      if (hits > best.hits) best = { shift: s, hits };
    }
    // Un sommaire dont les titres ne se retrouvent pas n'en est pas un.
    if (best.hits < Math.min(5, entries.length / 2)) return none;
    shift = best.shift;
  }
  const chapters = entries
    .map((e) => ({ title: e.title, page: e.page + shift }))
    .sort((a, b) => a.page - b.page);
  return { chapters, pages: tocPages };
}

/** Le chapitre d'une page : le dernier commencé avant elle. */
export function chapterOf(chapters: Chapter[], page: number) {
  let title: string | null = null;
  for (const c of chapters) if (c.page <= page) title = c.title;
  return title;
}
