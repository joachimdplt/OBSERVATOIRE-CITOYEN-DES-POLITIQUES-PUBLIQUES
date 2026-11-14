import { parse } from 'csv-parse/sync';
import { SourceFormat } from '../../generated/prisma/enums';
import type {
  RawTable,
  SourceDatasetImporter,
} from '../../ports/source-dataset-importer';

const DELIMITERS = [';', ',', '\t'] as const;

/**
 * Les CSV des producteurs français : séparateur point-virgule le plus souvent,
 * parfois virgule ou tabulation ; UTF-8 avec ou sans BOM, ou Windows-1252
 * pour les plus anciens.
 */
export class CsvImporter implements SourceDatasetImporter {
  readonly format = SourceFormat.csv;

  read(file: Buffer): Promise<RawTable> {
    const text = decode(file);
    const rows: string[][] = parse(text, {
      delimiter: delimiterOf(text),
      bom: true,
      relax_column_count: true,
      // Les lignes vides restent : le numéro d'une ligne lue est celui du fichier.
      skip_empty_lines: false,
    });
    return Promise.resolve({ sheetNames: [], sheet: null, rows });
  }
}

/** UTF-8 si le fichier en est, sinon Windows-1252 : jamais de caractère perdu en silence. */
function decode(file: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(file);
  } catch {
    return new TextDecoder('windows-1252').decode(file);
  }
}

/** Le séparateur le plus fréquent sur la première ligne. */
function delimiterOf(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const counts = DELIMITERS.map((d) => firstLine.split(d).length - 1);
  return DELIMITERS[counts.indexOf(Math.max(...counts))];
}
