/** Une publication d'un fil de campagne, telle que le site la décrit. */
export type CampaignFeedItem = {
  url: string;
  title: string;
  /** AAAA-MM-JJTHH:MM:SSZ, si le site la date. */
  publishedAt: string | null;
  excerpt: string | null;
};

/**
 * Le fil d'un site de campagne : ses dernières publications, lues sur son
 * flux RSS ou Atom (découvert depuis la page s'il le faut).
 */
export interface CampaignFeed {
  latest(url: string): Promise<CampaignFeedItem[]>;
}

export const CAMPAIGN_FEED = Symbol('CAMPAIGN_FEED');
