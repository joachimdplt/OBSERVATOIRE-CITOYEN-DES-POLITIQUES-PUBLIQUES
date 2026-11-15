/** Une vidéo telle que le flux public de sa chaîne la décrit. */
export type FeedVideo = {
  youtubeId: string;
  title: string;
  /** AAAA-MM-JJTHH:MM:SSZ */
  publishedAt: string;
  url: string;
  thumbnail: string | null;
};

/**
 * Le flux public d'une chaîne vidéo : ses dernières vidéos. Le collecteur,
 * relancé chaque jour, garde ce qu'il a vu ; il ne connaît que ce port.
 */
export interface VideoFeed {
  latest(channelId: string): Promise<FeedVideo[]>;
  /**
   * Toutes les vidéos publiées par la chaîne depuis une date (AAAA-MM-JJ),
   * avec leur titre d'origine : lu une fois, à la première lecture.
   */
  history(channelId: string, since: string): Promise<FeedVideo[]>;
}

export const VIDEO_FEED = Symbol('VIDEO_FEED');
