import type { ProgrammePassage } from '../domain/programme';

/** Une page ou un fichier de programme, lu tel que reçu. */
export type ProgrammeFile = {
  /** L'adresse effectivement lue (la copie d'archive si l'original refuse). */
  url: string;
  bytes: Buffer;
  title: string;
  /** Les passages, mot pour mot, chacun sous sa rubrique. */
  passages: ProgrammePassage[];
  /** Les liens de la page, en adresses complètes, pour suivre une table des matières. */
  links: string[];
};

/**
 * La lecture d'un programme publié en ligne : page web ou PDF. Le collecteur
 * ne connaît que ce port.
 */
export interface ProgrammeReader {
  read(url: string): Promise<ProgrammeFile>;
}

export const PROGRAMME_READER = Symbol('PROGRAMME_READER');
