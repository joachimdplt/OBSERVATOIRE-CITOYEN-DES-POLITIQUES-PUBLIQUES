import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { HTMLElement, Node, TextNode, parse } from 'node-html-parser';
import {
  pdfParagraphs,
  splitProgramme,
  tableRows,
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
      const info = await run('pdfinfo', [file]).catch(() => ({ stdout: '' }));
      const title =
        /^Title:\s+(.+)$/m.exec(info.stdout)?.[1]?.trim() ||
        decodeURIComponent(url.split('/').pop() ?? url);
      // Page par page : une page qui porte un tableau chiffré se lit ligne
      // par ligne, les autres en paragraphes.
      const flowPages = stdout.split('\f');
      const layoutPages = layout.stdout.split('\f');
      const passages = flowPages.flatMap((flow, i) => {
        const rows = tableRows(layoutPages[i] ?? '');
        return rows.length >= 5 ? rows : splitProgramme(pdfParagraphs(flow));
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
    // La zone de contenu la plus fournie : une petite balise <article> à côté
    // d'un grand <main> ne contient pas le programme.
    const size = (e: HTMLElement | null) =>
      e ? e.text.replace(/\s+/g, ' ').length : 0;
    const article = root.querySelector('article');
    const main = root.querySelector('main');
    const body =
      article && size(article) >= 0.5 * size(main)
        ? article
        : (main ?? article ?? root);
    body
      .querySelectorAll(
        'script, style, nav, header, footer, aside, form, button, svg, noscript',
      )
      .forEach((e) => e.remove());
    const BLOCKS = 'h1, h2, h3, h4, p, li, blockquote';
    const passages: ProgrammePassage[] = [];
    let heading = title;
    for (const el of body.querySelectorAll(BLOCKS)) {
      // Un bloc qui en contient d'autres se lit par eux.
      if (el.querySelector(BLOCKS)) continue;
      const text = clean(el);
      if (!text) continue;
      if (/^H[1-4]$/.test(el.tagName)) heading = text;
      else if (text.length >= MIN_LENGTH) passages.push({ heading, text });
    }
    // Repli : une page dont le texte vit dans des blocs <div> (cartes,
    // accordéons) est lue bloc par bloc, quand la lecture par paragraphes en
    // laisse plus de la moitié de côté.
    const read = passages.reduce((n, p) => n + p.text.length, 0);
    if (read < 0.5 * size(body)) {
      const walked = walk(body, title);
      if (walked.reduce((n, p) => n + p.text.length, 0) > read)
        return { title, passages: walked, links };
    }
    return { title, passages, links };
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

const clean = (el: HTMLElement) => el.text.replace(/\s+/g, ' ').trim();
