/** Une adresse du plan d'un site, avec sa date de modification si elle est donnée. */
export type SitemapEntry = { url: string; lastmod: string | null };

/**
 * Un plan de site (sitemap XML) : soit des pages (<url><loc>), soit d'autres
 * plans (<sitemap><loc>, un index). La lecture ne garde que les adresses et
 * leurs dates.
 */
export function readSitemap(xml: string): {
  pages: SitemapEntry[];
  sitemaps: string[];
} {
  const block = (tag: string) =>
    [...xml.matchAll(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'gi'))].map(
      (m) => m[0],
    );
  const loc = (b: string) =>
    /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/i.exec(b)?.[1]?.trim() ?? null;
  const lastmod = (b: string) =>
    /<lastmod>\s*([^<\s]+)/i.exec(b)?.[1]?.trim() ?? null;
  return {
    pages: block('url')
      .map((b) => ({ url: loc(b), lastmod: lastmod(b) }))
      .filter((e): e is SitemapEntry => Boolean(e.url)),
    sitemaps: block('sitemap')
      .map(loc)
      .filter((u): u is string => Boolean(u)),
  };
}

/** Les plans annoncés dans un robots.txt (« Sitemap: … »). */
export const sitemapsFromRobots = (robots: string): string[] =>
  [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
