import { Injectable } from '@nestjs/common';
import { gunzipSync } from 'node:zlib';
import {
  readSitemap,
  sitemapsFromRobots,
  type SitemapEntry,
} from '../../domain/sitemap';
import type { SitemapSource } from '../../ports/sitemap-source';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
};

/** Au-delà, un plan est tronqué : un site ne se lit pas en un jour. */
const MAX_PAGES = 2000;

/**
 * Le plan d'un site : les plans que son robots.txt annonce, sinon les
 * adresses habituelles (sitemap.xml, sitemap_index.xml, wp-sitemap.xml),
 * en suivant les index de plans.
 */
@Injectable()
export class FetchSitemap implements SitemapSource {
  async pages(site: string): Promise<SitemapEntry[]> {
    const root = new URL('/', site).href;
    const robots = await this.get(new URL('robots.txt', root).href);
    const queue = robots ? sitemapsFromRobots(robots) : [];
    if (queue.length === 0)
      queue.push(
        ...['sitemap.xml', 'sitemap_index.xml', 'wp-sitemap.xml'].map(
          (p) => new URL(p, root).href,
        ),
      );
    const seen = new Set<string>();
    const pages = new Map<string, SitemapEntry>();
    while (queue.length && seen.size < 60 && pages.size < MAX_PAGES) {
      const url = queue.shift()!;
      if (seen.has(url)) continue;
      seen.add(url);
      const xml = await this.get(url);
      if (!xml || !/<(urlset|sitemapindex)[\s>]/i.test(xml)) continue;
      const { pages: found, sitemaps } = readSitemap(xml);
      for (const p of found) pages.set(p.url, p);
      queue.push(...sitemaps);
    }
    return [...pages.values()].slice(0, MAX_PAGES);
  }

  private async get(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return null;
      const bytes = Buffer.from(await res.arrayBuffer());
      // Un plan compressé (.xml.gz) se décompresse.
      return (
        bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes
      ).toString('utf8');
    } catch {
      return null;
    }
  }
}
