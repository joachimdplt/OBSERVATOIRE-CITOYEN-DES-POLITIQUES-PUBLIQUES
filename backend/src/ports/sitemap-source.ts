import type { SitemapEntry } from '../domain/sitemap';

/** Les pages qu'un site déclare dans son plan (robots.txt, sitemap.xml). */
export interface SitemapSource {
  pages(site: string): Promise<SitemapEntry[]>;
}

export const SITEMAP_SOURCE = Symbol('SITEMAP_SOURCE');
