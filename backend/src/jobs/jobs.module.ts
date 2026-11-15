import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AssembleeOpenData } from '../adapters/assemblee/assemblee-open-data';
import { WebProgrammeReader } from '../adapters/programmes/web-programme-reader';
import { WikimediaPhotos } from '../adapters/wikimedia/wikimedia-photos';
import { YoutubeFeed } from '../adapters/youtube/youtube-feed';
import { PARLIAMENT_SOURCE } from '../ports/parliament-source';
import { PHOTO_SOURCE } from '../ports/photo-source';
import { PROGRAMME_READER } from '../ports/programme-reader';
import { VIDEO_FEED } from '../ports/video-feed';
import { RawFileStore } from '../storage/raw-file-store';
import { DailyCollection } from './daily-collection';

/** Les tâches planifiées de l'API : la collecte quotidienne. */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    DailyCollection,
    RawFileStore,
    { provide: PARLIAMENT_SOURCE, useClass: AssembleeOpenData },
    { provide: PROGRAMME_READER, useClass: WebProgrammeReader },
    { provide: VIDEO_FEED, useClass: YoutubeFeed },
    { provide: PHOTO_SOURCE, useClass: WikimediaPhotos },
  ],
  exports: [DailyCollection],
})
export class JobsModule {}
