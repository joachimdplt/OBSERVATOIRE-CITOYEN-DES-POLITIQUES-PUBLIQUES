import { Module } from '@nestjs/common';
import { FetchSiteCrawler } from '../../adapters/web/fetch-site-crawler';
import { SITE_CRAWLER } from '../../ports/site-crawler';
import { CrawlSitesController } from './crawl-sites/crawl-sites';

/** Ce que fait chaque candidat, d'après ses sites de campagne et de parti. */
@Module({
  controllers: [CrawlSitesController],
  providers: [{ provide: SITE_CRAWLER, useClass: FetchSiteCrawler }],
})
export class CampaignModule {}
