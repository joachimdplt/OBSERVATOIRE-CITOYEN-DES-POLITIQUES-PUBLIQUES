import { Injectable } from '@nestjs/common';
import { parse } from 'node-html-parser';
import { writtenDates } from '../../domain/site-map';
import type { CrawledPage, SiteCrawler } from '../../ports/site-crawler';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  'Accept-Language': 'fr',
};

/** Ce qui n'est pas une page à lire : fichiers, comptes, administration. */
const SKIP =
  /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|docx?|xlsx?|pptx?|ics|xml|css|js)(\?|$)|\/(wp-admin|wp-login|wp-json|feed|login|connexion|se-connecter|panier|cart|compte|account|don|faire-un-don|adherer|soutenir)(\/|$)|[?&](replytocom|share|utm_)/i;

/** Le même site, avec ou sans « www ». */
const hostOf = (u: string) => new URL(u).hostname.replace(/^www\./, '');

/**
 * Un lecteur qui parcourt un site page à page, en largeur : l'accueil, puis
 * chaque lien interne, sans dépasser la profondeur ni le nombre de pages
 * donnés, avec une pause entre deux pages pour ménager le serveur.
 */
@Injectable()
export class FetchSiteCrawler implements SiteCrawler {
  async crawl(
    start: string,
    { depth = 3, pages = 80 }: { depth?: number; pages?: number } = {},
  ): Promise<CrawledPage[]> {
    const host = hostOf(start);
    const seen = new Set<string>([this.key(start)]);
    const queue: { url: string; depth: number }[] = [{ url: start, depth: 0 }];
    const out: CrawledPage[] = [];
    while (queue.length && out.length < pages) {
      const { url, depth: d } = queue.shift()!;
      await new Promise((r) => setTimeout(r, 250));
      let html: string;
      let finalUrl = url;
      try {
        const res = await fetch(url, {
          headers: HEADERS,
          redirect: 'follow',
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok || !/html/.test(res.headers.get('content-type') ?? ''))
          continue;
        finalUrl = res.url || url;
        if (hostOf(finalUrl) !== host) continue;
        html = await res.text();
      } catch {
        continue;
      }
      const root = parse(html);
      root
        .querySelectorAll('script, style, noscript, svg')
        .forEach((e) => e.remove());
      const title = (
        root.querySelector('h1')?.text ||
        root.querySelector('title')?.text ||
        finalUrl
      )
        .replace(/\s+/g, ' ')
        .trim();
      const body = (root.querySelector('main') ?? root).text.replace(
        /\s+/g,
        ' ',
      );
      const timeDates = root
        .querySelectorAll('time[datetime]')
        .map((t) => (t.getAttribute('datetime') ?? '').slice(0, 10))
        .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v));
      out.push({
        url: finalUrl.split('#')[0],
        title,
        depth: d,
        textLength: body.trim().length,
        dates: [...new Set([...timeDates, ...writtenDates(body)])].sort(),
      });
      if (d >= depth) continue;
      for (const a of root.querySelectorAll('a[href]')) {
        let next: string;
        try {
          next = new URL(a.getAttribute('href') ?? '', finalUrl).href.split(
            '#',
          )[0];
        } catch {
          continue;
        }
        if (!/^https?:/.test(next) || hostOf(next) !== host || SKIP.test(next))
          continue;
        const k = this.key(next);
        if (seen.has(k)) continue;
        seen.add(k);
        queue.push({ url: next, depth: d + 1 });
      }
    }
    return out;
  }

  /** Une adresse, sans « www » ni barre finale, pour ne la lire qu'une fois. */
  private key(u: string) {
    const x = new URL(u);
    return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/$/, '')}${x.search}`;
  }
}
