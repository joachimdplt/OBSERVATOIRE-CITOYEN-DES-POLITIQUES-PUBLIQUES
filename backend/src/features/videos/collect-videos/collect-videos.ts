import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { Requires, SessionGuard } from '../../../auth/session.guard';
import { VIDEO_HISTORY_SINCE, videoCandidates } from '../../../domain/video';
import { VIDEO_FEED, type VideoFeed } from '../../../ports/video-feed';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Le collecteur des vidéos : il lit le flux public de chaque chaîne suivie et
 * garde chaque vidéo nouvelle telle que le flux la décrit, rattachée aux
 * candidats qu'elle concerne. Le flux ne donne que les dernières vidéos :
 * à sa première lecture, une chaîne donne aussi son historique depuis le
 * début de l'année de l'élection ; relancé chaque jour, le collecteur suit
 * ensuite la chaîne sans rien perdre.
 */
@Controller('admin/collect')
@UseGuards(SessionGuard)
@Requires('preprint')
export class CollectVideosController {
  constructor(
    private prisma: PrismaService,
    @Inject(VIDEO_FEED) private feed: VideoFeed,
  ) {}

  @Post('videos')
  @HttpCode(200)
  collect() {
    return collectVideos(this.prisma, this.feed);
  }
}

/** Le geste du collecteur, appelé par l'administration ou par la tâche planifiée. */
export async function collectVideos(prisma: PrismaService, feed: VideoFeed) {
  const channels = await prisma.videoChannel.findMany();
  const candidates = await prisma.candidate.findMany({
    select: { id: true, name: true },
  });
  const report = {
    channels: 0,
    histories: 0,
    seen: 0,
    collected: 0,
    linked: 0,
    failed: [] as string[],
  };
  for (const channel of channels) {
    let videos;
    try {
      videos = await feed.latest(channel.youtubeId);
    } catch (e) {
      report.failed.push(`${channel.name} : ${String(e)}`);
      continue;
    }
    // À sa première lecture, une chaîne donne aussi son historique depuis
    // le début de l'année de l'élection ; le flux ne montre que les quinze
    // dernières.
    if (!channel.historyReadAt) {
      try {
        videos = [
          ...videos,
          ...(await feed.history(channel.youtubeId, VIDEO_HISTORY_SINCE)),
        ];
        await prisma.videoChannel.update({
          where: { id: channel.id },
          data: { historyReadAt: new Date() },
        });
        report.histories++;
      } catch (e) {
        report.failed.push(`${channel.name} (historique) : ${String(e)}`);
      }
    }
    report.channels++;
    for (const v of videos) {
      report.seen++;
      if (await prisma.video.findUnique({ where: { youtubeId: v.youtubeId } }))
        continue;
      const links = videoCandidates(v.title, channel, candidates);
      // Une vidéo d'une chaîne de parti ou d'institution qui ne nomme aucun
      // candidat ne concerne pas l'élection : elle n'est pas gardée.
      if (links.length === 0) continue;
      await prisma.video.create({
        data: {
          youtubeId: v.youtubeId,
          channelId: channel.id,
          title: v.title,
          publishedAt: new Date(v.publishedAt),
          url: v.url,
          thumbnail: v.thumbnail,
          candidates: { create: links },
        },
      });
      report.collected++;
      report.linked += links.length;
    }
  }
  return report;
}
