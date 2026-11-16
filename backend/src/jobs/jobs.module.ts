import { FetchCampaignPageReader } from '../adapters/web/campaign-page-reader';
import { CAMPAIGN_PAGE_READER } from '../ports/campaign-page-reader';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AssembleeOpenData } from '../adapters/assemblee/assemblee-open-data';
import { WebProgrammeReader } from '../adapters/programmes/web-programme-reader';
import { WikimediaPhotos } from '../adapters/wikimedia/wikimedia-photos';
import { WikidataAccounts } from '../adapters/wikimedia/wikidata-accounts';
import { ACCOUNT_SOURCE, SITE_ACCOUNT_SOURCE } from '../ports/account-source';
import { WebsiteAccounts } from '../adapters/web/website-accounts';
import { YoutubeFeed } from '../adapters/youtube/youtube-feed';
import { PARLIAMENT_SOURCE } from '../ports/parliament-source';
import { PHOTO_SOURCE } from '../ports/photo-source';
import { PROGRAMME_READER } from '../ports/programme-reader';
import { VIDEO_FEED } from '../ports/video-feed';
import { RawFileStore } from '../storage/raw-file-store';
import { FetchSiteCrawler } from '../adapters/web/fetch-site-crawler';
import { FetchSitemap } from '../adapters/web/fetch-sitemap';
import { SITE_CRAWLER } from '../ports/site-crawler';
import { SITEMAP_SOURCE } from '../ports/sitemap-source';
import { OllamaTopicClassifier } from '../adapters/classifier/ollama-topic-classifier';
import { TOPIC_CLASSIFIER } from '../ports/topic-classifier';
import { SiteReading } from './site-reading';
import { DailyCollection } from './daily-collection';

/** Les tâches planifiées de l'API : la collecte quotidienne, puis le
 * rangement des chapitres nouveaux. */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    DailyCollection,
    SiteReading,
    { provide: SITEMAP_SOURCE, useClass: FetchSitemap },
    { provide: SITE_CRAWLER, useClass: FetchSiteCrawler },
    { provide: CAMPAIGN_PAGE_READER, useClass: FetchCampaignPageReader },
    RawFileStore,
    { provide: PARLIAMENT_SOURCE, useClass: AssembleeOpenData },
    { provide: PROGRAMME_READER, useClass: WebProgrammeReader },
    { provide: VIDEO_FEED, useClass: YoutubeFeed },
    { provide: PHOTO_SOURCE, useClass: WikimediaPhotos },
    { provide: ACCOUNT_SOURCE, useClass: WikidataAccounts },
    { provide: SITE_ACCOUNT_SOURCE, useClass: WebsiteAccounts },
    { provide: TOPIC_CLASSIFIER, useClass: OllamaTopicClassifier },
  ],
  exports: [DailyCollection],
})
export class JobsModule {}
