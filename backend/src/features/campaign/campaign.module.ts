import { Module } from '@nestjs/common';
import { FetchSiteCrawler } from '../../adapters/web/fetch-site-crawler';
import { FetchSitemap } from '../../adapters/web/fetch-sitemap';
import { WebProgrammeReader } from '../../adapters/programmes/web-programme-reader';
import { PROGRAMME_READER } from '../../ports/programme-reader';
import { SITE_CRAWLER } from '../../ports/site-crawler';
import { SITEMAP_SOURCE } from '../../ports/sitemap-source';
import { AddCampaignSourceController } from './add-campaign-source/add-campaign-source';
import { DiscoverSitePagesController } from './discover-site-pages/discover-site-pages';
import { ReadSitePagesController } from './read-site-pages/read-site-pages';

/** Ce que fait chaque candidat, d'après ses sites de campagne et de parti, lus en entier. */
@Module({
  controllers: [
    AddCampaignSourceController,
    DiscoverSitePagesController,
    ReadSitePagesController,
  ],
  providers: [
    { provide: SITE_CRAWLER, useClass: FetchSiteCrawler },
    { provide: SITEMAP_SOURCE, useClass: FetchSitemap },
    { provide: PROGRAMME_READER, useClass: WebProgrammeReader },
  ],
})
export class CampaignModule {}
