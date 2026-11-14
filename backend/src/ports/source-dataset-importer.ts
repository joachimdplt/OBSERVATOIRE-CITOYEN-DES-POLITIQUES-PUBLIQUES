import type { SourceFormat } from '../generated/prisma/enums';

/** Un fichier lu : chaque ligne est une suite de cases en texte, sans interprétation. */
export type RawTable = {
  sheetNames: string[];
  sheet: string | null;
  rows: string[][];
};

/**
 * Lit un fichier source en lignes brutes. Une implémentation par format :
 * CSV et XLSX aujourd'hui, l'API d'opendatasoft ou un PDF demain.
 *
 * Rien n'est interprété ici : ni nombre, ni date, ni code. Une case vide reste
 * une chaîne vide, un « nd » reste « nd ». La traduction en valeurs vient
 * après, une fois les colonnes décrites.
 */
export interface SourceDatasetImporter {
  readonly format: SourceFormat;
  read(file: Buffer, sheet?: string): Promise<RawTable>;
}

export const SOURCE_DATASET_IMPORTERS = Symbol('SourceDatasetImporter[]');
