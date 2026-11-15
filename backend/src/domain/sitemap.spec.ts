import { readSitemap, sitemapsFromRobots } from './sitemap';

describe('le plan d’un site', () => {
  it('lit les pages et leur date de modification', () => {
    const xml = `<urlset><url><loc>https://becht2027.fr/projet-france/</loc><lastmod>2026-11-12T10:00:00+00:00</lastmod></url><url><loc>https://becht2027.fr/agir/</loc></url></urlset>`;
    expect(readSitemap(xml).pages).toEqual([
      {
        url: 'https://becht2027.fr/projet-france/',
        lastmod: '2026-11-12T10:00:00+00:00',
      },
      { url: 'https://becht2027.fr/agir/', lastmod: null },
    ]);
  });

  it('suit un index de plans et les plans annoncés dans robots.txt', () => {
    expect(
      readSitemap(
        '<sitemapindex><sitemap><loc>https://x.fr/page-sitemap.xml</loc></sitemap></sitemapindex>',
      ).sitemaps,
    ).toEqual(['https://x.fr/page-sitemap.xml']);
    expect(
      sitemapsFromRobots(
        'User-agent: *\nSitemap: https://x.fr/sitemap_index.xml',
      ),
    ).toEqual(['https://x.fr/sitemap_index.xml']);
  });
});
