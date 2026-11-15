/** Une page lue en parcourant un site. */
export type CrawledPage = {
  url: string;
  title: string;
  /** Le nombre de clics depuis l'accueil. */
  depth: number;
  textLength: number;
  /** Les dates lues sur la page, AAAA-MM-JJ. */
  dates: string[];
};

/**
 * Le parcours d'un site, comme un lecteur qui clique : de l'accueil, chaque
 * lien interne, jusqu'à une profondeur et un nombre de pages donnés.
 */
export interface SiteCrawler {
  crawl(
    url: string,
    limits?: { depth?: number; pages?: number },
  ): Promise<CrawledPage[]>;
}

export const SITE_CRAWLER = Symbol('SITE_CRAWLER');
