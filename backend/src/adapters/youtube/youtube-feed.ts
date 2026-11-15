import { Injectable } from '@nestjs/common';
import { parse } from 'node-html-parser';
import type { FeedVideo, VideoFeed } from '../../ports/video-feed';

/**
 * Le flux Atom public d'une chaîne YouTube : ses quinze dernières vidéos,
 * sans clé ni compte. Les vues et les notes du flux ne sont pas lues.
 */
@Injectable()
export class YoutubeFeed implements VideoFeed {
  async latest(channelId: string): Promise<FeedVideo[]> {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      { signal: AbortSignal.timeout(30_000) },
    );
    if (!res.ok) throw new Error(`${res.status} sur la chaîne ${channelId}`);
    return readFeed(await res.text());
  }
}

/** Les vidéos d'un flux Atom de YouTube. */
export function readFeed(xml: string): FeedVideo[] {
  const root = parse(xml, { lowerCaseTagName: true });
  return root.querySelectorAll('entry').flatMap((entry) => {
    const id = entry.querySelector('yt\\:videoid')?.text.trim();
    const title = entry.querySelector('title')?.text.trim();
    const published = entry.querySelector('published')?.text.trim();
    if (!id || !title || !published) return [];
    return [
      {
        youtubeId: id,
        title,
        publishedAt: published,
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail:
          entry.querySelector('media\\:thumbnail')?.getAttribute('url') ?? null,
      },
    ];
  });
}
