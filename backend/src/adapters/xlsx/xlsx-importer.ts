import JSZip from 'jszip';
import { PassThrough } from 'node:stream';
import { SaxesParser } from 'saxes';
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
 * reste une affaire d'affichage. Une formule donne son dernier résultat
 * enregistré.
 *
 * Le classeur se lit en flux, directement dans son XML : le fichier des
 * médecins de la DREES (73 Mo, six onglets, 313 000 lignes) chargé d'un bloc
 * épuisait la mémoire de l'API. La table des textes partagés et celle des
 * formats se lisent d'abord, puis seule la feuille demandée.
 */
export class XlsxImporter implements SourceDatasetImporter {
  readonly format = SourceFormat.xlsx;

  async read(file: Buffer, sheet?: string): Promise<RawTable> {
    const zip = await JSZip.loadAsync(file);
    const sheets = await sheetsOf(zip);
    const sheetNames = sheets.map((t) => t.name);
    const target = sheet ? sheets.find((t) => t.name === sheet) : sheets[0];
    if (!target) {
      throw new Error(
        `L'onglet « ${sheet} » n'existe pas : ${sheetNames.join(', ')}.`,
      );
    }
    const entry = zip.file(target.path);
    if (!entry) throw new Error(`L'onglet « ${target.name} » est absent.`);

    const shared = await sharedStringsOf(zip);
    const dateStyles = await dateStylesOf(zip);
    const rows = await rowsOf(entry, shared, dateStyles);
    return { sheetNames, sheet: target.name, rows };
  }
}

type Tag = { name: string; attributes: Record<string, string> };
type Handlers = {
  open?: (tag: Tag) => void;
  text?: (text: string) => void;
  close?: (name: string) => void;
};

/** Lire une entrée de l'archive en flux, balise par balise. */
async function parse(
  entry: JSZip.JSZipObject,
  { open, text, close }: Handlers,
): Promise<void> {
  const parser = new SaxesParser();
  if (open) parser.on('opentag', (tag) => open(tag as unknown as Tag));
  if (text) parser.on('text', text);
  if (close) parser.on('closetag', (tag) => close(tag.name));
  const decoder = new TextDecoder('utf-8');
  // Le flux de JSZip est un flux Node ancien : il passe par un flux moderne
  // pour se lire morceau par morceau.
  const stream = entry
    .nodeStream('nodebuffer')
    .pipe(new PassThrough()) as AsyncIterable<Buffer>;
  for await (const chunk of stream)
    parser.write(decoder.decode(chunk, { stream: true }));
  parser.write(decoder.decode());
  parser.close();
}

/** Les onglets du classeur dans leur ordre, chacun avec le chemin de sa feuille. */
async function sheetsOf(zip: JSZip): Promise<{ name: string; path: string }[]> {
  const targets = new Map<string, string>();
  const rels = zip.file('xl/_rels/workbook.xml.rels');
  if (rels)
    await parse(rels, {
      open: ({ name, attributes }) => {
        if (name === 'Relationship')
          targets.set(attributes.Id, attributes.Target);
      },
    });
  const sheets: { name: string; path: string }[] = [];
  const workbook = zip.file('xl/workbook.xml');
  if (workbook)
    await parse(workbook, {
      open: ({ name, attributes }) => {
        if (name !== 'sheet') return;
        const target = targets.get(attributes['r:id']) ?? '';
        sheets.push({
          name: attributes.name,
          path: target.startsWith('/')
            ? target.slice(1)
            : `xl/${target.replace(/^\.\//, '')}`,
        });
      },
    });
  return sheets;
}

/** Les textes partagés : une cellule de texte n'en porte que le numéro. */
async function sharedStringsOf(zip: JSZip): Promise<string[]> {
  const entry = zip.file('xl/sharedStrings.xml');
  if (!entry) return [];
  const strings: string[] = [];
  let current = '';
  let inText = false;
  // La lecture phonétique (rPh) n'est pas le texte de la cellule.
  let inPhonetic = false;
  await parse(entry, {
    open: ({ name }) => {
      if (name === 'si') current = '';
      else if (name === 'rPh') inPhonetic = true;
      else if (name === 't' && !inPhonetic) inText = true;
    },
    text: (text) => {
      if (inText) current += text;
    },
    close: (name) => {
      if (name === 't') inText = false;
      else if (name === 'rPh') inPhonetic = false;
      else if (name === 'si') strings.push(current);
    },
  });
  return strings;
}

/** Les formats de nombre qui écrivent une date : 14 à 22, 45 à 47, ou un format propre. */
const BUILTIN_DATES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
const isDateFormat = (code: string) =>
  /[dmyhs]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]|\\./g, ''));

/** Les styles de cellule qui affichent une date, par leur rang. */
async function dateStylesOf(zip: JSZip): Promise<Set<number>> {
  const entry = zip.file('xl/styles.xml');
  const dates = new Set<number>();
  if (!entry) return dates;
  const custom = new Map<number, string>();
  let inCellXfs = false;
  let index = 0;
  await parse(entry, {
    open: ({ name, attributes }) => {
      if (name === 'numFmt')
        custom.set(Number(attributes.numFmtId), attributes.formatCode ?? '');
      else if (name === 'cellXfs') inCellXfs = true;
      else if (name === 'xf' && inCellXfs) {
        const id = Number(attributes.numFmtId ?? 0);
        const code = custom.get(id);
        if (code !== undefined ? isDateFormat(code) : BUILTIN_DATES.has(id))
          dates.add(index);
        index++;
      }
    },
    close: (name) => {
      if (name === 'cellXfs') inCellXfs = false;
    },
  });
  return dates;
}

/** « AB12 » : la colonne AB, la 28e, de rang 27. */
function columnIndex(reference: string): number {
  let n = 0;
  for (const ch of reference.replace(/\d+$/, ''))
    n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Un numéro de série Excel (calendrier 1900) en date ISO. */
const excelDate = (serial: number) =>
  new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 86400000))
    .toISOString()
    .slice(0, 10);

type Cell = { at: number; type: string; style: number };

/**
 * Chaque ligne de la feuille, vides comprises : le numéro d'une ligne lue est
 * celui que le producteur voit dans son fichier, et la provenance d'une
 * valeur le cite.
 */
async function rowsOf(
  entry: JSZip.JSZipObject,
  shared: string[],
  dateStyles: Set<number>,
): Promise<string[][]> {
  const textOf = (cell: Cell, raw: string, inline: string): string => {
    switch (cell.type) {
      case 's':
        return shared[Number(raw)] ?? '';
      case 'inlineStr':
        return inline;
      case 'str':
      case 'e':
        return raw;
      case 'b':
        return raw === '1' ? 'true' : 'false';
      default: {
        if (raw === '') return '';
        const n = Number(raw);
        if (!Number.isFinite(n)) return raw;
        return dateStyles.has(cell.style) ? excelDate(n) : String(n);
      }
    }
  };

  const rows: string[][] = [];
  let width = 0;
  let row: string[] = [];
  let rowNumber = 0;
  let cell: Cell | null = null;
  let raw = '';
  let inline = '';
  let reading: 'v' | 't' | null = null;

  await parse(entry, {
    open: ({ name, attributes }) => {
      if (name === 'row') {
        rowNumber = attributes.r ? Number(attributes.r) : rowNumber + 1;
        row = [];
      } else if (name === 'c') {
        cell = {
          at: attributes.r ? columnIndex(attributes.r) : row.length,
          type: attributes.t ?? 'n',
          style: Number(attributes.s ?? 0),
        };
        raw = '';
        inline = '';
      } else if (name === 'v') reading = 'v';
      else if (name === 't' && cell) reading = 't';
    },
    text: (text) => {
      if (reading === 'v') raw += text;
      else if (reading === 't') inline += text;
    },
    close: (name) => {
      if (name === 'v' || name === 't') reading = null;
      else if (name === 'c' && cell) {
        row[cell.at] = textOf(cell, raw, inline);
        cell = null;
      } else if (name === 'row') {
        while (rows.length < rowNumber - 1) rows.push([]);
        const cells = Array.from(row, (c) => c ?? '');
        rows.push(cells);
        width = Math.max(width, cells.length);
      }
    },
  });

  for (const cells of rows) while (cells.length < width) cells.push('');
  return rows;
}
