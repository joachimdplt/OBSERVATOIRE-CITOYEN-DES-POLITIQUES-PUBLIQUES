import { Injectable } from '@nestjs/common';
import { parse, type HTMLElement } from 'node-html-parser';
import type { CampaignFeed, CampaignFeedItem } from '../../ports/campaign-feed';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
};

const text = (e: HTMLElement | null | undefined) =>
  (e?.text ?? '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Le fil d'un site : son flux RSS ou Atom. Donnée une page, on cherche le
 * flux qu'elle annonce (<link rel="alternate">), puis l'adresse « feed/ »
 * des sites WordPress. Sans flux, le fil est vide : rien n'est deviné.
 */
@Injectable()
export class RssCampaignFeed implements CampaignFeed {
  async latest(url: string): Promise<CampaignFeedItem[]> {
    const first = await this.get(url);
    if (!first) return [];
    if (this.isFeed(first)) return this.read(first);
    const announced = parse(first)
      .querySelectorAll('link[rel="alternate"]')
      .find((l) => /rss|atom/.test(l.getAttribute('type') ?? ''))
      ?.getAttribute('href');
    const candidates = [
      announced ? new URL(announced, url).href : null,
      new URL('feed/', url.endsWith('/') ? url : `${url}/`).href,
    ].filter((u): u is string => Boolean(u));
    for (const feedUrl of candidates) {
      const body = await this.get(feedUrl);
      if (body && this.isFeed(body)) return this.read(body);
    }
    return [];
  }

  private async get(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      });
      return res.ok ? await res.text() : null;
    } catch {
      return null;
    }
  }

  private isFeed(body: string) {
    return /<(rss|feed)[\s>]/i.test(body.slice(0, 2000));
  }

  private read(xml: string): CampaignFeedItem[] {
    const root = parse(xml, { lowerCaseTagName: true });
    const items = root.querySelectorAll('item');
    const entries = items.length ? items : root.querySelectorAll('entry');
    return entries.flatMap((e) => {
      const link =
        text(e.querySelector('link')) ||
        e.querySelector('link')?.getAttribute('href') ||
        '';
      const title = text(e.querySelector('title'));
      if (!link || !title) return [];
      const date =
        text(e.querySelector('pubdate')) ||
        text(e.querySelector('published')) ||
        text(e.querySelector('updated'));
      const when = date ? new Date(date) : null;
      const excerpt = text(
        e.querySelector('description') ?? e.querySelector('summary'),
      )
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
      return [
        {
          url: link,
          title,
          publishedAt:
            when && !isNaN(when.getTime()) ? when.toISOString() : null,
          excerpt: excerpt || null,
        },
      ];
    });
  }
}
