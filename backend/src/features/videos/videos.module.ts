import { Module } from '@nestjs/common';
import { YoutubeFeed } from '../../adapters/youtube/youtube-feed';
import { VIDEO_FEED } from '../../ports/video-feed';
import { AddVideoChannelController } from './add-video-channel/add-video-channel';
import { CollectVideosController } from './collect-videos/collect-videos';

/** Les vidéos publiques des candidats, lues sur les chaînes primaires suivies. */
@Module({
  controllers: [AddVideoChannelController, CollectVideosController],
  providers: [{ provide: VIDEO_FEED, useClass: YoutubeFeed }],
})
export class VideosModule {}
