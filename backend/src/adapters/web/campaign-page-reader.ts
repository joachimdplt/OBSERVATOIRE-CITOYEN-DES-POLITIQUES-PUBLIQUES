import { Injectable } from '@nestjs/common';
import { HTMLElement, parse } from 'node-html-parser';
import {
  isParticipationCount,
  type DiagnosisChapter,
  type ParticipationCount,
} from '../../domain/campaign';
import type {
  CampaignPage,
  CampaignPageReader,
} from '../../ports/campaign-page-reader';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  'Accept-Language': 'fr',
};

const clean = (t: string) => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/** Le premier paragraphe d'un bloc dont la classe porte ce mot. */
const byClass = (el: HTMLElement, word: string) =>
  el
    .querySelectorAll('p')
    .find((p) => (p.getAttribute('class') ?? '').includes(word));

/**
 * Une page de campagne lue par sa structure. Un diagnostic chiffré se
 * reconnaît à ses sections : un titre (h2), un nom de chapitre, une
 * introduction, puis des panneaux (article) qui portent chacun un indicateur
 * (h3), son unité, la phrase de la campagne et la source qu'elle cite.
 * Rien n'est recalculé : chaque texte est repris tel qu'il est publié.
 */
@Injectable()
export class FetchCampaignPageReader implements CampaignPageReader {
  async read(url: string): Promise<CampaignPage> {
    const res = await fetch(url, {
      headers: HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`${res.status} sur ${url}`);
    const root = parse(await res.text());
    root
      .querySelectorAll('script, style, noscript, svg, nav, header, footer')
      .forEach((n) => n.remove());
    const title = clean(
      root.querySelector('h1')?.text ??
        root.querySelector('title')?.text ??
        url,
    );
    const chapters: DiagnosisChapter[] = [];
    for (const section of root.querySelectorAll('section')) {
      const h2 = section.querySelector('h2');
      const panels = section
        .querySelectorAll('article')
        .filter((a) => a.querySelector('h3')?.text.trim());
      if (!h2 || panels.length === 0) continue;
      const intro = h2.parentNode
        .querySelectorAll('p')
        .find((p) => !(p.getAttribute('class') ?? '').includes('kicker'));
      chapters.push({
        label: clean(byClass(section, 'kicker')?.text ?? ''),
        title: clean(h2.text),
        intro: clean(intro?.text ?? ''),
        indicators: panels.map((a) => {
          const source = a
            .querySelectorAll('p')
            .find((p) => /^\s*source/i.test(p.text));
          return {
            name: clean(a.querySelector('h3')!.text),
            unit: clean(byClass(a, 'unite')?.text ?? ''),
            sentence: clean(byClass(a, 'chapo')?.text ?? ''),
            source: clean(source?.text ?? '').replace(/^source\s*:\s*/i, ''),
            sourceUrl: source?.querySelector('a')?.getAttribute('href') ?? null,
          };
        }),
      });
    }
    // Les comptes d'une consultation : une carte par sujet (son nom, puis
    // son compte), et les phrases du site qui commencent par un compte. Les
    // contributions, dans des listes, ne sont jamais lues.
    const counts: ParticipationCount[] = [];
    for (const card of root.querySelectorAll('a, article')) {
      const label = card.querySelector('strong, h3');
      const count = card
        .querySelectorAll('em, span, p')
        .find((e) => isParticipationCount(clean(e.text)));
      if (!label || !count || card.closest('li')) continue;
      counts.push({ label: clean(label.text), text: clean(count.text) });
    }
    for (const p of root.querySelectorAll('p')) {
      if (p.closest('li') || p.closest('a')) continue;
      const first = clean(p.text).split(/(?<=[.!?])\s+/)[0] ?? '';
      if (isParticipationCount(first))
        counts.push({ label: null, text: first });
    }
    return { title, chapters, counts };
  }
}
