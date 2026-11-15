import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DAILY_HOUR, DAILY_TIME_ZONE } from '../domain/schedule';
import { collectCandidatePhotos } from '../features/elections/collect-candidate-photos/collect-candidate-photos';
import { collectParliamentTexts } from '../features/politics/collect-parliament-texts/collect-parliament-texts';
import { collectProgrammes } from '../features/programmes/collect-programmes/collect-programmes';
import { collectVideos } from '../features/videos/collect-videos/collect-videos';
import { Role } from '../generated/prisma/enums';
import {
  PARLIAMENT_SOURCE,
  type ParliamentSource,
} from '../ports/parliament-source';
import { PHOTO_SOURCE, type PhotoSource } from '../ports/photo-source';
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
  await step('videos', () => collectVideos(prisma, deps.videos));
  await step('photos', () => collectCandidatePhotos(prisma, deps.photos));
}
