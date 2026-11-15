import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { HTMLElement, parse } from 'node-html-parser';
import {
  pdfParagraphs,
  splitProgramme,
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
      const info = await run('pdfinfo', [file]).catch(() => ({ stdout: '' }));
      const title =
        /^Title:\s+(.+)$/m.exec(info.stdout)?.[1]?.trim() ||
        decodeURIComponent(url.split('/').pop() ?? url);
      return { title, passages: splitProgramme(pdfParagraphs(stdout)) };
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
    const body =
      root.querySelector('article') ?? root.querySelector('main') ?? root;
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
    return { title, passages, links };
  }
}

const clean = (el: HTMLElement) => el.text.replace(/\s+/g, ' ').trim();
