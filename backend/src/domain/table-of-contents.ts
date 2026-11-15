/** Un chapitre annoncé par le sommaire d'un document, et sa page de début. */
export type Chapter = { title: string; page: number };

/** Le sommaire lu : ses chapitres, et les pages qu'il occupe. */
export type Contents = { chapters: Chapter[]; pages: number[] };

import { piecesOf } from './pdf-layout';

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
export function tableOfContents(pages: string[], xml = ''): Contents {
  const none: Contents = { chapters: [], pages: [] };
  const entries: Chapter[] = [];
  const tocPages: number[] = [];
  // Lu par position quand la mise en page est connue : le sommaire peut
  // être n'importe où, en tête comme en fin de document.
  const fromXml = [...entriesFromXml(xml)].filter(([, found]) =>
    found.every((e) => e.page >= 1 && e.page <= pages.length + 5),
  );
  if (fromXml.reduce((n, [, found]) => n + found.length, 0) >= 5)
    for (const [page, found] of fromXml) {
      entries.push(...found);
      tocPages.push(page);
    }
  // Le sommaire est au début du document.
  const head = pages.slice(0, Math.max(6, Math.ceil(pages.length / 5)));
  if (tocPages.length === 0)
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

/** Un titre de sommaire, sans sa numérotation ni ses points de conduite. */
const cleanTitle = (t: string) =>
  t
    .replace(/^\d{1,3}\.?\s+/, '')
    .replace(/[\s.…·_]{3,}$/, '')
    .replace(/\s+(page|p\.)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Les entrées de sommaire d'une page, lues avec la position de chaque
 * morceau de texte (pdftohtml -xml) : un numéro de page se rattache au
 * titre écrit à sa hauteur, même dans une autre colonne ; un titre sur
 * plusieurs lignes se rejoint, que le numéro soit sur sa première ou sa
 * dernière ligne.
 */
export function entriesFromXml(xml: string): Map<number, Chapter[]> {
  const byPage = new Map<number, Chapter[]>();
  const all = piecesOf(xml);
  for (const page of new Set(all.map((p) => p.page))) {
    const pieces = all
      .filter((p) => p.page === page)
      .sort((a, b) => a.top - b.top || a.left - b.left);
    type Entry = {
      top: number;
      bottom: number;
      left: number;
      title: string;
      page: number;
    };
    const entries: Entry[] = [];
    const used = new Set<(typeof pieces)[number]>();
    // Un titre et son numéro sur un même morceau : « Énergie ...... 3 ».
    for (const p of pieces) {
      const m = /^(.*\p{L}.*?)(?:\s{3,}|\s*[.…·_]{3,}\s*)(\d{1,3})$/u.exec(
        p.raw,
      );
      if (m) {
        entries.push({
          top: p.top,
          bottom: p.top + p.height,
          left: p.left,
          title: cleanTitle(m[1]),
          page: Number(m[2]),
        });
        used.add(p);
      }
    }
    // Un numéro seul, et le titre écrit à sa hauteur, à sa gauche.
    for (const n of pieces) {
      if (used.has(n) || !/^\d{1,3}$/.test(n.text)) continue;
      const row = pieces.filter(
        (t) =>
          !used.has(t) &&
          t !== n &&
          t.left < n.left &&
          /\p{L}{2,}/u.test(t.text) &&
          Math.abs(t.top - n.top) <= Math.max(t.height, n.height) * 0.6,
      );
      if (row.length === 0) continue;
      // Le titre est le texte le plus proche du numéro : un intitulé de
      // partie écrit dans la marge, à la même hauteur, n'en fait pas partie.
      row.sort((a, b) => a.left - b.left);
      // Le mot « Page » devant le numéro n'est pas du titre.
      for (let i = row.length - 1; i >= 0; i--)
        if (/^(page|p\.)$/i.test(row[i].text)) row.splice(i, 1);
      // Écrit dans la taille du titre le plus proche du numéro : un
      // intitulé de partie en gros caractères n'en est pas.
      const nearest = row[row.length - 1];
      for (let i = row.length - 1; i >= 0; i--)
        if (Math.abs(row[i].height - nearest.height) > 2) row.splice(i, 1);
      while (row.length > 1 && row[1].left - (row[0].left + row[0].width) > 40)
        row.shift();
      if (row.length === 0) continue;
      row.forEach((t) => used.add(t));
      used.add(n);
      entries.push({
        top: Math.min(...row.map((t) => t.top)),
        bottom: Math.max(...row.map((t) => t.top + t.height)),
        left: row[0].left,
        title: cleanTitle(row.map((t) => t.text).join(' ')),
        page: Number(n.text),
      });
    }
    // Un mot seul de mise en page (« Page », « Sommaire ») n'est pas un
    // chapitre.
    for (let i = entries.length - 1; i >= 0; i--)
      if (
        !entries[i].title ||
        /^(page|sommaire|table des mati[èe]res)$/i.test(entries[i].title)
      )
        entries.splice(i, 1);
    if (entries.length < 3) continue;
    // Un sommaire est fait de titres courts : la plupart des lignes de la
    // page en sont.
    const lettered = pieces.filter(
      (p) => /\p{L}{3,}/u.test(p.text) && p.height < 200,
    ).length;
    if (
      entries.some((e) => e.title.length > 140) ||
      entries.length * 2.5 < lettered
    )
      continue;
    // Les lignes de titre sans numéro : la suite d'un titre (en minuscule,
    // juste sous lui), ou son début (juste au-dessus d'une suite en
    // minuscule).
    for (const t of pieces) {
      if (used.has(t) || !/\p{L}{2,}/u.test(t.text)) continue;
      const near = (e: Entry, gap: number) =>
        Math.abs(e.left - t.left) <= 30 && gap >= -2 && gap <= t.height * 0.8;
      if (/^\p{Ll}/u.test(t.text)) {
        const above = entries.find((e) => near(e, t.top - e.bottom));
        if (above) {
          above.title = `${above.title} ${t.text}`.replace(/\s+/g, ' ').trim();
          above.bottom = t.top + t.height;
          used.add(t);
        }
      } else {
        const below = entries.find(
          (e) =>
            /^\p{Ll}/u.test(e.title) && near(e, e.top - (t.top + t.height)),
        );
        if (below) {
          below.title = `${cleanTitle(t.text)} ${below.title}`;
          below.top = t.top;
          used.add(t);
        }
      }
    }
    // Un sommaire se lit de haut en bas, pages croissantes.
    const ordered = [...entries].sort(
      (a, b) => a.top - b.top || a.left - b.left,
    );
    let rising = 0;
    for (let i = 1; i < ordered.length; i++)
      if (ordered[i].page >= ordered[i - 1].page) rising++;
    if (rising < (ordered.length - 1) * 0.7) continue;
    byPage.set(
      page,
      ordered.map((e) => ({ title: e.title, page: e.page })),
    );
  }
  return byPage;
}
