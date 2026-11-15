import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { HTMLElement, Node, TextNode, parse } from 'node-html-parser';
import { readPdfLayout } from '../../domain/pdf-layout';
import { chapterOf, tableOfContents } from '../../domain/table-of-contents';
import {
  pdfParagraphs,
  splitProgramme,
  tableRows,
  cardRows,
  type ProgrammePassage,
} from '../../domain/programme';
import type {
  ProgrammeFile,
  ProgrammeReader,
} from '../../ports/programme-reader';

const run = promisify(execFile);

/** Un navigateur ordinaire : certains sites refusent les clients sans nom. */
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

/** La copie d'archive, quand le site du candidat refuse la lecture automatique. */
const ARCHIVE = 'https://web.archive.org/web/2026id_/';

const MIN_LENGTH = 40;

/**
 * Lit un programme en ligne. Un PDF passe par pdftotext (poppler), puis est
 * remis en paragraphes ; une page web se lit par sa structure : chaque
 * intitulé ouvre une rubrique, chaque paragraphe ou élément de liste est un
 * passage.
 */
@Injectable()
export class WebProgrammeReader implements ProgrammeReader {
  async read(url: string): Promise<ProgrammeFile> {
    let res = await this.get(url);
    let read = url;
    if (!res.ok && res.status === 403) {
      read = ARCHIVE + url;
      res = await this.get(read);
    }
    if (!res.ok) throw new Error(`${res.status} sur ${url}`);
    let bytes = Buffer.from(await res.arrayBuffer());
    // Une copie d'archive peut arriver compressée sans le dire.
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes);
    return { url: read, bytes, ...(await this.parse(bytes, url)) };
  }

  /** Le texte d'un fichier déjà reçu (PDF ou page web), découpé en passages. */
  async parse(bytes: Buffer, url: string) {
    if (bytes.subarray(0, 4).toString() === '%PDF')
      return { ...(await this.pdf(bytes, url)), links: [] as string[] };
    return this.html(bytes.toString('utf8'), url);
  }

  private get(url: string) {
    return fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(90_000),
    });
  }

  private async pdf(bytes: Buffer, url: string) {
    const dir = await mkdtemp(join(tmpdir(), 'programme-'));
    try {
      const file = join(dir, 'programme.pdf');
      await writeFile(file, bytes);
      const { stdout } = await run('pdftotext', ['-enc', 'UTF-8', file, '-'], {
        maxBuffer: 64 * 1024 * 1024,
      });
      // La même conversion, en gardant la mise en page : les tableaux chiffrés
      // s'y lisent ligne par ligne.
      const layout = await run(
        'pdftotext',
        ['-layout', '-enc', 'UTF-8', file, '-'],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      // Et avec la taille de chaque ligne : les titres s'y reconnaissent.
      const xml = await run(
        'pdftohtml',
        ['-xml', '-i', '-q', '-stdout', '-enc', 'UTF-8', file],
        { maxBuffer: 128 * 1024 * 1024 },
      ).catch(() => ({ stdout: '' }));
      const fonts = readPdfLayout(xml.stdout);
      const info = await run('pdfinfo', [file]).catch(() => ({ stdout: '' }));
      const title =
        /^Title:\s+(.+)$/m.exec(info.stdout)?.[1]?.trim() ||
        decodeURIComponent(url.split('/').pop() ?? url);
      // Page par page : une page qui porte un tableau chiffré se lit ligne
      // par ligne, une infographie carte par carte, les autres en
      // paragraphes sous leurs titres.
      const flowPages = stdout.split('\f');
      const layoutPages = layout.stdout.split('\f');
      // Le sommaire du document, quand il en a un : ses chapitres rangent
      // chaque page, mot pour mot.
      const contents = tableOfContents(layoutPages, xml.stdout);
      const byPage = flowPages.map((flow, i) => {
        const page = layoutPages[i] ?? '';
        const rows = tableRows(page);
        if (rows.length >= 5) return rows;
        const cards = cardRows(page);
        const figured = cards.filter((c) => /\s:\s[+\-−]?\d/.test(c.text));
        if (figured.length >= 3) return cards;
        // Les titres lus par leur taille ; à défaut, devinés dans le texte.
        if (fonts) return fonts[i] ?? [];
        return splitProgramme(pdfParagraphs(flow));
      });
      const passages = byPage.flatMap((rows, i) => {
        // Le sommaire lui-même n'est pas un passage du programme.
        if (contents.pages.includes(i + 1)) return [];
        const chapter = chapterOf(contents.chapters, i + 1);
        return rows.map((r) => ({
          ...r,
          heading: chapter ?? r.heading,
          page: i + 1,
        }));
      });
      return { title, passages };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private html(source: string, url: string) {
    const root = parse(source);
    const links = [
      ...new Set(
        root
          .querySelectorAll('a[href]')
          .map((a) => {
            try {
              return new URL(a.getAttribute('href') ?? '', url).href.split(
                '#',
              )[0];
            } catch {
              return '';
            }
          })
          .filter(Boolean),
      ),
    ];
    const title = (
      root.querySelector('h1')?.text ??
      root.querySelector('title')?.text ??
      url
    )
      .replace(/\s+/g, ' ')
      .trim();
    // Le code et les styles ne sont pas du texte : retirés avant de mesurer.
    root
      .querySelectorAll('script, style, noscript, template')
      .forEach((e) => e.remove());
    // La zone de contenu la plus fournie : une petite balise <article> à côté
    // d'un grand <main> ne contient pas le programme.
    const size = (e: HTMLElement | null) =>
      e ? e.text.replace(/\s+/g, ' ').length : 0;
    const article = root.querySelector('article');
    const main = root.querySelector('main');
    const chosen =
      article && size(article) >= 0.5 * size(main)
        ? article
        : (main ?? article ?? root);
    // Une balise <main> presque vide, le texte étant à côté (des sites
    // montés avec NationBuilder), ne contient pas le programme : la page se
    // lit en entier.
    const body = size(chosen) < 0.1 * size(root) ? root : chosen;
    // Le sommaire de la page, quand elle en a un : des liens vers ses
    // propres sections (« 01 I. Une France humaine » → #france-humaine).
    // Ses chapitres, mot pour mot, rangent chaque passage.
    const chapters = inPageContents(root, body);
    body
      .querySelectorAll(
        'script, style, nav, header, footer, aside, form, button, svg, noscript',
      )
      .forEach((e) => e.remove());
    const BLOCKS = 'h1, h2, h3, h4, p, li, blockquote';
    // Le titre d'un chapitre repliable (<summary>) compte comme un titre.
    const isBlock = (el: HTMLElement) =>
      ['H1', 'H2', 'H3', 'H4', 'P', 'LI', 'BLOCKQUOTE', 'SUMMARY'].includes(
        el.tagName,
      );
    const passages: ProgrammePassage[] = [];
    let heading = title;
    let chapter: string | null = null;
    for (const el of body.querySelectorAll('*')) {
      const id = el.getAttribute('id');
      if (id && chapters.has(id)) chapter = chapters.get(id)!;
      if (!isBlock(el)) continue;
      // Un bloc qui en contient d'autres se lit par eux.
      if (el.querySelector(BLOCKS)) continue;
      const text = clean(el);
      if (!text) continue;
      if (/^(H[1-4]|SUMMARY)$/.test(el.tagName)) heading = text;
      else if (text.length >= MIN_LENGTH)
        passages.push({ heading: chapter ?? heading, text });
    }
    // Repli : une page dont le texte vit dans des blocs <div> (cartes,
    // accordéons) est lue bloc par bloc, quand la lecture par paragraphes en
    // laisse plus de la moitié de côté.
    const read = passages.reduce((n, p) => n + p.text.length, 0);
    if (read < 0.5 * size(body)) {
      const walked = walk(body, title);
      if (walked.reduce((n, p) => n + p.text.length, 0) > read)
        return { title, passages: withoutChrome(walked), links };
    }
    return { title, passages: withoutChrome(passages), links };
  }
}

/** Les éléments qui ouvrent un nouveau bloc de texte. */
const BLOCK_TAGS = new Set([
  'DIV',
  'P',
  'LI',
  'SECTION',
  'ARTICLE',
  'BLOCKQUOTE',
  'TD',
  'DD',
  'DT',
  'UL',
  'OL',
  'TABLE',
  'TR',
  'FIGURE',
  'FIGCAPTION',
  'BR',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);

/**
 * La lecture bloc par bloc : le texte s'accumule à travers les éléments en
 * ligne et se coupe à chaque bloc ; un intitulé (h1 à h4) ouvre une rubrique.
 */
function walk(body: HTMLElement, title: string): ProgrammePassage[] {
  const passages: ProgrammePassage[] = [];
  let heading = title;
  let buffer = '';
  const flush = () => {
    const text = buffer.replace(/\s+/g, ' ').trim();
    if (text.length >= MIN_LENGTH) passages.push({ heading, text });
    buffer = '';
  };
  const visit = (node: Node) => {
    if (node instanceof TextNode) {
      buffer += node.text;
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (/^H[1-4]$/.test(tag)) {
      flush();
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (text) heading = text;
      return;
    }
    const block = BLOCK_TAGS.has(tag);
    if (block) flush();
    for (const child of node.childNodes) visit(child);
    if (block) flush();
  };
  visit(body);
  flush();
  return passages;
}

/** Le texte d'un bloc, sans la déclaration de document qui s'y glisse. */
const clean = (el: HTMLElement) =>
  el.text
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Les rubriques de mise en page (« Partager cette page ») ne sont pas du programme. */
function withoutChrome(passages: ProgrammePassage[]) {
  return passages
    .map((p) => ({
      ...p,
      text: p.text.replace(/<!doctype[^>]*>/gi, '').trim(),
    }))
    .filter(
      (p) =>
        p.text.length >= MIN_LENGTH &&
        !/^(partager|suivez|suivre|rejoindre|rejoignez|newsletter|inscrivez|adh[ée]rez)/i.test(
          p.heading.trim(),
        ),
    );
}

/**
 * Le sommaire interne d'une page : le groupe d'au moins trois liens qui
 * mènent à des sections de la page elle-même. Chaque lien donne un titre de
 * chapitre, sans sa numérotation (« 01 », « I. »).
 */
function inPageContents(root: HTMLElement, body: HTMLElement) {
  const ids = new Set(
    body
      .querySelectorAll('[id]')
      .map((e) => e.getAttribute('id') ?? '')
      .filter(Boolean),
  );
  const groups = new Map<HTMLElement, { id: string; title: string }[]>();
  for (const a of root.querySelectorAll('a[href^="#"]')) {
    const id = decodeURIComponent((a.getAttribute('href') ?? '').slice(1));
    if (!ids.has(id)) continue;
    const title = a.text
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\d{1,3}\s*/, '')
      .replace(/^[IVXLC]+\.\s+/, '')
      .trim();
    if (!/\p{L}{3,}/u.test(title)) continue;
    const group = a.parentNode;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push({ id, title });
  }
  const best = [...groups.values()].sort((x, y) => y.length - x.length)[0];
  return new Map(
    best && best.length >= 3 ? best.map((e) => [e.id, e.title]) : [],
  );
}
