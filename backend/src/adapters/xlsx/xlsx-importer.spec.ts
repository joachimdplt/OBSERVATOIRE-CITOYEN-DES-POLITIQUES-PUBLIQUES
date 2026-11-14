import ExcelJS from 'exceljs';
import { XlsxImporter } from './xlsx-importer';

async function workbook(): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const notes = book.addWorksheet('Notes');
  notes.addRow(['Source : DREES']);
  const data = book.addWorksheet('APL 2024');
  data.addRow(['code', 'commune', 'apl', 'total']);
  const row = data.addRow(['01001', 'L’Abergement-Clémenciat', 3.2871, null]);
  row.getCell(3).numFmt = '0.0';
  row.getCell(4).value = { formula: 'C2*2', result: 6.5742 };
  data.addRow(['01002', 'L’Abergement-de-Varey', null, 'nd']);
  return Buffer.from(await book.xlsx.writeBuffer());
}

describe('la lecture d’un classeur', () => {
  it('liste les onglets et lit le premier par défaut', async () => {
    const table = await new XlsxImporter().read(await workbook());
    expect(table.sheetNames).toEqual(['Notes', 'APL 2024']);
    expect(table.sheet).toBe('Notes');
    expect(table.rows).toEqual([['Source : DREES']]);
  });

  it('lit l’onglet demandé, avec la valeur de la cellule et non son arrondi affiché', async () => {
    const table = await new XlsxImporter().read(await workbook(), 'APL 2024');
    expect(table.rows).toEqual([
      ['code', 'commune', 'apl', 'total'],
      ['01001', 'L’Abergement-Clémenciat', '3.2871', '6.5742'],
      ['01002', 'L’Abergement-de-Varey', '', 'nd'],
    ]);
  });

  it('dit quels onglets existent quand on en demande un absent', async () => {
    await expect(
      new XlsxImporter().read(await workbook(), 'APL 2023'),
    ).rejects.toThrow(/Notes, APL 2024/);
  });

  it('garde les lignes vides : la ligne 3 lue est la ligne 3 du classeur', async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('APL');
    sheet.getRow(1).values = ['Titre'];
    sheet.getRow(3).values = ['code', 'apl'];
    const table = await new XlsxImporter().read(
      Buffer.from(await book.xlsx.writeBuffer()),
    );
    expect(table.rows[2]).toEqual(['code', 'apl']);
  });
});
