import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
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

  /**
   * L'historique d'une chaîne, lu par yt-dlp sur sa page publique de
   * vidéos : de la plus récente à la plus ancienne, jusqu'à la date donnée.
   * Le titre est celui d'origine, en français, jamais une traduction
   * automatique.
   */
  async history(channelId: string, since: string): Promise<FeedVideo[]> {
    const run = promisify(execFile)(
      'yt-dlp',
      [
        '--skip-download',
        '--lazy-playlist',
        '--dateafter',
        since.replace(/-/g, ''),
        '--break-on-reject',
        '--extractor-args',
        'youtube:lang=fr',
        '--print',
        '%(id)s\t%(timestamp)s\t%(title)s',
        `https://www.youtube.com/channel/${channelId}/videos`,
      ],
      { maxBuffer: 32 * 1024 * 1024, timeout: 60 * 60_000 },
    );
    // Arrivée à la date demandée, la lecture s'arrête avec le code 101 :
    // c'est la fin attendue, la liste lue jusque-là est bonne.
    const stdout = await run.then(
      (r) => r.stdout,
      (e: { code?: number; stdout?: string }) => {
        if (e.code === 101 && typeof e.stdout === 'string') return e.stdout;
        throw e;
      },
    );
    return readHistory(stdout);
  }
}

/** Les lignes « identifiant, horodatage, titre » que yt-dlp imprime. */
export function readHistory(lines: string): FeedVideo[] {
  return lines.split('\n').flatMap((line) => {
    const [id, timestamp, ...title] = line.split('\t');
    if (!id || !/^\d+$/.test(timestamp ?? '') || title.length === 0) return [];
    return [
      {
        youtubeId: id,
        title: title.join('\t').trim(),
        publishedAt: new Date(Number(timestamp) * 1000).toISOString(),
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      },
    ];
  });
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
