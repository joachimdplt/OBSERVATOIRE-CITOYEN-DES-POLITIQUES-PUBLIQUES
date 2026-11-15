import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { NOT_CANDIDATE_WORDS, pageKind } from '../../../domain/site-map';
import {
  CampaignSourceKind,
  SitePageStatus,
} from '../../../generated/prisma/enums';
import { SITE_CRAWLER, type SiteCrawler } from '../../../ports/site-crawler';
import {
  SITEMAP_SOURCE,
  type SitemapSource,
} from '../../../ports/sitemap-source';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * La découverte des pages de chaque site de campagne et de parti, une fois
 * par jour : son plan (sitemap), ou à défaut un parcours de lien en lien.
 * Une page nouvelle, ou modifiée depuis sa dernière lecture, passe « à
 * lire » ; la lecture se fait ensuite peu à peu.
 */
@Controller('admin/collect')
@UseGuards(SessionGuard)
@Requires('preprint')
export class DiscoverSitePagesController {
  constructor(
    private prisma: PrismaService,
    @Inject(SITEMAP_SOURCE) private sitemaps: SitemapSource,
    @Inject(SITE_CRAWLER) private crawler: SiteCrawler,
  ) {}

  @Post('site-pages')
  @HttpCode(200)
  discover() {
    return discoverSitePages(this.prisma, this.sitemaps, this.crawler);
  }
}

/** Le geste de la découverte, appelé par l'administration ou la collecte quotidienne. */
export async function discoverSitePages(
  prisma: PrismaService,
  sitemaps: SitemapSource,
  crawler: SiteCrawler,
) {
  const sources = await prisma.campaignSource.findMany({
    where: { kind: CampaignSourceKind.site },
  });
  const report = { sites: 0, fromSitemap: 0, fromLinks: 0, pending: 0 };
  for (const s of sources) {
    report.sites++;
    let entries = (await sitemaps.pages(s.url)).map((e) => ({
      url: e.url,
      lastmod: e.lastmod ? new Date(e.lastmod) : null,
      depth: 1,
    }));
    if (entries.length) report.fromSitemap++;
    else {
      // Sans plan : le parcours de lien en lien.
      report.fromLinks++;
      entries = (await crawler.crawl(s.url, { depth: 3, pages: 150 })).map(
        (p) => ({ url: p.url, lastmod: null, depth: p.depth }),
      );
    }
    const now = new Date();
    for (const e of entries) {
      if (NOT_CANDIDATE_WORDS.test(e.url)) continue;
      const lastmod =
        e.lastmod && !isNaN(e.lastmod.getTime()) ? e.lastmod : null;
      const page = await prisma.sitePage.findUnique({
        where: { sourceId_url: { sourceId: s.id, url: e.url } },
      });
      if (!page) {
        await prisma.sitePage.create({
          data: {
            sourceId: s.id,
            url: e.url,
            title: '',
            kind: pageKind(e.url, ''),
            depth: e.depth,
            textLength: 0,
            dates: [],
            lastmod,
          },
        });
        report.pending++;
        continue;
      }
      // Modifiée depuis la dernière lecture : à relire.
      const changed =
        lastmod &&
        page.readAt &&
        lastmod > page.readAt &&
        page.status === SitePageStatus.read;
      await prisma.sitePage.update({
        where: { id: page.id },
        data: {
          lastSeen: now,
          lastmod: lastmod ?? page.lastmod,
          ...(changed ? { status: SitePageStatus.pending } : {}),
        },
      });
      if (changed) report.pending++;
    }
  }
  return report;
}
