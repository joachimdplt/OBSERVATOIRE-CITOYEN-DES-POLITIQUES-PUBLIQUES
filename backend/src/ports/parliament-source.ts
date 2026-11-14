import type { GroupMandate } from '../domain/parliament';

/** Un texte déposé au Parlement, tel que ses données ouvertes le décrivent. */
export type FiledText = {
  /** La référence du texte chez le producteur : « PIONANR5L17B0966 ». */
  sourceRef: string;
  kind: 'bill' | 'government_bill';
  chamber: 'national_assembly' | 'senate';
  title: string;
  number: string;
  /** AAAA-MM-JJ */
  filedAt: string;
  /** Le premier signataire, par sa référence de parlementaire ; rien pour le Gouvernement. */
  firstAuthorRef: string | null;
  /** La page du texte, pour le lecteur. */
  url: string;
  /** Le texte intégral à lire, article par article. */
  textUrl: string;
};

/** Un parlementaire et ses groupes, avec leurs dates. */
export type Member = { name: string; groups: GroupMandate[] };

/**
 * Les données ouvertes d'une chambre : la liste des textes déposés, les
 * parlementaires et leurs groupes, et le texte intégral d'un dépôt. Un
 * adapter par chambre ; le collecteur ne connaît que ce port.
 */
export interface ParliamentSource {
  /** L'adresse d'où viennent les groupes, citée avec chaque groupe affiché. */
  readonly groupsSource: string;
  listTexts(): Promise<FiledText[]>;
  members(): Promise<Map<string, Member>>;
  fetchText(textUrl: string): Promise<string>;
}

export const PARLIAMENT_SOURCE = Symbol('PARLIAMENT_SOURCE');
