import ExcelJS from 'exceljs';
import { SourceFormat } from '../../generated/prisma/enums';
import type {
  RawTable,
  SourceDatasetImporter,
} from '../../ports/source-dataset-importer';

/**
 * Les classeurs Excel. Un onglet est lu à la fois : le premier, ou celui
 * qu'on demande.
 *
 * La valeur lue est celle de la cellule, pas son affichage. Un tableur qui
 * affiche 3,3 peut contenir 3,2871 : c'est 3,2871 qu'on garde, et l'arrondi
 * reste une affaire d'affichage.
 */
export class XlsxImporter implements SourceDatasetImporter {
  readonly format = SourceFormat.xlsx;

  async read(file: Buffer, sheet?: string): Promise<RawTable> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file as unknown as ArrayBuffer);
    const sheetNames = workbook.worksheets.map((w) => w.name);
    const worksheet = sheet
      ? workbook.getWorksheet(sheet)
      : workbook.worksheets[0];
    if (!worksheet) {
      throw new Error(
        `L'onglet « ${sheet} » n'existe pas : ${sheetNames.join(', ')}.`,
      );
    }

    // Chaque ligne du tableur, vides comprises : le numéro d'une ligne lue
    // est celui que le producteur voit dans son fichier, et la provenance
    // d'une valeur le cite.
    //
    // Le parcours passe par `eachRow` et `row.values` : demander chaque
    // cellule une à une (`getRow(r).getCell(c)`) coûte 45 ms par ligne sur le
    // fichier de la DREES, soit une demi-heure pendant laquelle l'API ne
    // répond plus à personne.
    const width = worksheet.columnCount;
    const rows: string[][] = Array.from({ length: worksheet.rowCount }, () =>
      Array<string>(width).fill(''),
    );
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values = row.values as ExcelJS.CellValue[];
      rows[rowNumber - 1] = Array.from({ length: width }, (_, i) =>
        cellText(values[i + 1]),
      );
    });
    return { sheetNames, sheet: worksheet.name, rows };
  }
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if ('result' in value) return cellText(value.result);
  if ('richText' in value)
    return value.richText.map((part) => part.text).join('');
  if ('text' in value) return String(value.text);
  if ('error' in value) return String(value.error);
  return '';
}
