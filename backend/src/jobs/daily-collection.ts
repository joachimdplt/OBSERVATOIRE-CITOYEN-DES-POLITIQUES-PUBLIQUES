import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DAILY_HOUR, DAILY_TIME_ZONE } from '../domain/schedule';
import { collectCandidateAccounts } from '../features/elections/collect-candidate-accounts/collect-candidate-accounts';
import { collectCandidatePhotos } from '../features/elections/collect-candidate-photos/collect-candidate-photos';
import { collectParliamentTexts } from '../features/politics/collect-parliament-texts/collect-parliament-texts';
import { collectProgrammes } from '../features/programmes/collect-programmes/collect-programmes';
import { discoverSitePages } from '../features/campaign/discover-site-pages/discover-site-pages';
import { readCampaignSources } from '../features/campaign/read-campaign-sources/read-campaign-sources';
import { collectVideos } from '../features/videos/collect-videos/collect-videos';
import { suggestCapLabels } from '../features/subjects/suggest-cap-labels/suggest-cap-labels';
import {
  TOPIC_CLASSIFIER,
  type TopicClassifier,
} from '../ports/topic-classifier';
import { Role } from '../generated/prisma/enums';
import {
  PARLIAMENT_SOURCE,
  type ParliamentSource,
} from '../ports/parliament-source';
import {
  ACCOUNT_SOURCE,
  SITE_ACCOUNT_SOURCE,
  type AccountSource,
  type SiteAccountSource,
} from '../ports/account-source';
import {
  CAMPAIGN_PAGE_READER,
  type CampaignPageReader,
} from '../ports/campaign-page-reader';
import { PHOTO_SOURCE, type PhotoSource } from '../ports/photo-source';
import { SITE_CRAWLER, type SiteCrawler } from '../ports/site-crawler';
import { SITEMAP_SOURCE, type SitemapSource } from '../ports/sitemap-source';
import {
  PROGRAMME_READER,
  type ProgrammeReader,
} from '../ports/programme-reader';
import { VIDEO_FEED, type VideoFeed } from '../ports/video-feed';
import { PrismaService } from '../prisma/prisma.service';
import { RawFileStore } from '../storage/raw-file-store';

/**
 * La mise à jour quotidienne : chaque jour à 6 h, heure de Paris, l'API
 * relance elle-même ses collecteurs (textes déposés, programmes, vidéos,
 * photos) et garde le compte rendu de chacun, daté. Une collecte qui échoue
 * n'arrête pas les autres.
 */
@Injectable()
export class DailyCollection {
  private readonly log = new Logger('Collecte quotidienne');

  constructor(
    private prisma: PrismaService,
    private store: RawFileStore,
    @Inject(PARLIAMENT_SOURCE) private parliament: ParliamentSource,
    @Inject(PROGRAMME_READER) private programmes: ProgrammeReader,
    @Inject(VIDEO_FEED) private videos: VideoFeed,
    @Inject(PHOTO_SOURCE) private photos: PhotoSource,
    @Inject(ACCOUNT_SOURCE) private accounts: AccountSource,
    @Inject(SITE_ACCOUNT_SOURCE) private sites: SiteAccountSource,
    @Inject(SITEMAP_SOURCE) private sitemaps: SitemapSource,
    @Inject(SITE_CRAWLER) private crawler: SiteCrawler,
    @Inject(CAMPAIGN_PAGE_READER) private campaign: CampaignPageReader,
    @Inject(TOPIC_CLASSIFIER) private classifier: TopicClassifier,
  ) {}

  @Cron(`0 ${DAILY_HOUR} * * *`, {
    name: 'collecte-quotidienne',
    timeZone: DAILY_TIME_ZONE,
    disabled: process.env.COLLECTION_SCHEDULE === 'off',
  })
  run() {
    return runDailyCollection(
      {
        prisma: this.prisma,
        keep: (bytes) => this.store.keep(bytes),
        parliament: this.parliament,
        programmes: this.programmes,
        videos: this.videos,
        photos: this.photos,
        accounts: this.accounts,
        sites: this.sites,
        sitemaps: this.sitemaps,
        crawler: this.crawler,
        campaign: this.campaign,
        classifier: this.classifier,
      },
      this.log,
    );
  }
}

export type CollectionDeps = {
  prisma: PrismaService;
  keep: (bytes: Buffer) => Promise<string>;
  parliament: ParliamentSource;
  programmes: ProgrammeReader;
  videos: VideoFeed;
  photos: PhotoSource;
  accounts: AccountSource;
  sites: SiteAccountSource;
  sitemaps: SitemapSource;
  crawler: SiteCrawler;
  campaign: CampaignPageReader;
  /** Le modèle de langue du vote, pour ranger les chapitres nouveaux. */
  classifier: TopicClassifier;
};

/** La collecte de chaque source, l'une après l'autre, chacune datée et gardée. */
export async function runDailyCollection(
  deps: CollectionDeps,
  log: Pick<Logger, 'log' | 'warn' | 'error'> = new Logger(
    'Collecte quotidienne',
  ),
) {
  const { prisma } = deps;
  const actor = await prisma.user.findFirst({
    where: { role: Role.admin, active: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!actor) {
    log.warn('Aucun compte d’administration actif : collecte sautée.');
    return;
  }
  const step = async (kind: string, collect: () => Promise<object>) => {
    const run = await prisma.collectionRun.create({ data: { kind } });
    try {
      const summary = await collect();
      await prisma.collectionRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), ok: true, summary },
      });
      log.log(`${kind} : ${JSON.stringify(summary)}`);
    } catch (e) {
      await prisma.collectionRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          ok: false,
          summary: { error: String(e) },
        },
      });
      log.error(`${kind} : ${String(e)}`);
    }
  };
  await step('parliament', () =>
    collectParliamentTexts(prisma, deps.parliament, actor.id),
  );
  await step('programmes', () =>
    collectProgrammes(prisma, deps.programmes, deps.keep, actor.id),
  );
  // Les chapitres nouveaux sont rangés dans la foulée : le classeur est
  // réentraîné, puis chaque chapitre passe par le vote.
  await step('subjects', () => suggestCapLabels(prisma, deps.classifier));
  // Les comptes d'abord : une chaîne nouvelle est lue dans la foulée.
  await step('accounts', () =>
    collectCandidateAccounts(prisma, deps.accounts, deps.sites),
  );
  await step('videos', () => collectVideos(prisma, deps.videos));
  await step('photos', () => collectCandidatePhotos(prisma, deps.photos));
  // Les pages des sites, à lire ensuite peu à peu (voir SiteReading).
  await step('sites', () =>
    discoverSitePages(prisma, deps.sitemaps, deps.crawler),
  );
  await step('campaign', () => readCampaignSources(prisma, deps.campaign));
}
