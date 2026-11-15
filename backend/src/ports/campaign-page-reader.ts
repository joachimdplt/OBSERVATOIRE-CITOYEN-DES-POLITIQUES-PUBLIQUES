import type { DiagnosisChapter, ParticipationCount } from '../domain/campaign';

/** Une page de méthode ou de consultation d'une campagne, lue en entier. */
export type CampaignPage = {
  title: string;
  /** Les chapitres d'un diagnostic chiffré, quand la page en publie un. */
  chapters: DiagnosisChapter[];
  /** Les comptes qu'une consultation publie sur elle-même, sujet par sujet. */
  counts: ParticipationCount[];
};

/** La lecture d'une page de méthode ou de consultation. */
export interface CampaignPageReader {
  read(url: string): Promise<CampaignPage>;
}

export const CAMPAIGN_PAGE_READER = Symbol('CAMPAIGN_PAGE_READER');
