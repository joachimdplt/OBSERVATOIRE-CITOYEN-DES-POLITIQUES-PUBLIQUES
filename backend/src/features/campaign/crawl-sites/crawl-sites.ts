import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { pageKind } from '../../../domain/site-map';
import { CampaignSourceKind } from '../../../generated/prisma/enums';
import { SITE_CRAWLER, type SiteCrawler } from '../../../ports/site-crawler';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Le parcours des sites de campagne et de parti : chaque page lue, rangée
 * (programme, agenda, actualités, méthode, consultation), datée quand elle
 * l'est. La carte de chaque site se met à jour à chaque passage ; une page
 * disparue garde la date où elle a été vue pour la dernière fois.
 */
@Controller('admin/collect')
@UseGuards(SessionGuard)
@Requires('preprint')
export class CrawlSitesController {
  constructor(
    private prisma: PrismaService,
    @Inject(SITE_CRAWLER) private crawler: SiteCrawler,
  ) {}

  @Post('sites')
  @HttpCode(200)
  crawl() {
    return crawlSites(this.prisma, this.crawler);
  }
}

/** Le geste du collecteur, appelé par l'administration ou la collecte quotidienne. */
export async function crawlSites(prisma: PrismaService, crawler: SiteCrawler) {
  const sources = await prisma.campaignSource.findMany({
    where: { kind: CampaignSourceKind.site },
    include: { candidate: { select: { name: true } } },
  });
  const report = { sites: 0, pages: 0, failed: [] as string[] };
  for (const s of sources) {
    let pages;
    try {
      pages = await crawler.crawl(s.url);
    } catch (e) {
      report.failed.push(`${s.url} : ${String(e)}`);
      continue;
    }
    report.sites++;
    const now = new Date();
    for (const p of pages) {
      const data = {
        title: p.title.slice(0, 300),
        kind: pageKind(p.url, p.title),
        depth: p.depth,
        textLength: p.textLength,
        dates: p.dates,
        lastSeen: now,
      };
      await prisma.sitePage.upsert({
        where: { sourceId_url: { sourceId: s.id, url: p.url } },
        update: data,
        create: { ...data, sourceId: s.id, url: p.url },
      });
      report.pages++;
    }
  }
  return report;
}
