import type { TerritoryLevel } from '../generated/prisma/enums';
import type { DecimalSeparator } from './cell';
import { readPeriod } from './period';

/**
 * La description des colonnes d'un fichier : où lire le territoire, la
 * période, et quelle colonne porte quel indicateur.
 */
export type ImportDescription = {
  headerRow: number;
  /**
   * La première ligne de données, quand elle ne suit pas les en-têtes : la
   * DREES met une ligne d'unités entre les deux. Vide : la ligne suivante.
   */
  firstRow: number | null;
  /** La dernière ligne à lire, pour laisser de côté les notes de bas de tableau. */
  lastRow: number | null;
  territory: {
    column: string;
    level: TerritoryLevel;
    vintage: number;
    /**
     * Le code suivi de son libellé dans la même case, comme à la DREES :
     * « 045 -Loiret » se lit 45. Le zéro de tête d'un département sur trois
     * caractères tombe (« 02A » → 2A) ; 971 reste 971.
     */
    codeWithLabel?: boolean;
  };
  /** Une colonne, ou une même période pour tout le fichier. */
  period: { column: string } | { value: string };
  decimalSeparator: DecimalSeparator;
  /** La colonne qui porte la date de référence de chaque ligne : la date de l'arrêté d'un zonage. */
  referenceDateColumn?: string | null;
  /**
   * Les marques propres à ce fichier qui veulent dire « sans objet » : « NC »
   * dans le zonage national, pour une commune classée par arrondissement ou
   * une collectivité sans zonage. Elles deviennent une absence, jamais une
   * catégorie ni un zéro.
   */
  notApplicableMarkers?: string[];
  /** Les marques de ce fichier qui veulent dire « secret statistique » : « ND » à la DREES, moins de 10 personnes. */
  confidentialMarkers?: string[];
  /**
   * Les marques de ce fichier qui veulent dire zéro, quand le producteur le
   * dit : « . » à la DREES, « aucun professionnel dénombré ». Un zéro publié,
   * jamais une absence comblée.
   */
  zeroMarkers?: string[];
  /**
   * Les lignes à garder : un fichier qui croise spécialité, sexe et mode
   * d'exercice ne se lit qu'une combinaison à la fois. Les autres lignes sont
   * laissées de côté, et leur nombre est dit.
   */
  rowFilters?: RowCondition[];
  /** Chaque indicateur, sa colonne, et au besoin les lignes qui le portent (une tranche d'âge). */
  values: { column: string; indicatorCode: string; when?: RowCondition[] }[];
};

/** Une condition sur une case : égale à une valeur, ou différente. */
export type RowCondition = {
  column: string;
  equals?: string;
  notEquals?: string;
};

/** Vrai si la ligne remplit chaque condition. */
export function rowMatches(
  conditions: RowCondition[] | undefined,
  cellOf: (column: string) => string,
): boolean {
  return (conditions ?? []).every(({ column, equals, notEquals }) => {
    const cell = cellOf(column).trim();
    return equals !== undefined
      ? cell === equals.trim()
      : cell !== (notEquals ?? '').trim();
  });
}

/** Les erreurs d'une description au regard des en-têtes du fichier ; vide si elle tient. */
export function checkDescription(
  description: ImportDescription,
  header: string[],
): string[] {
  const errors: string[] = [];
  const known = new Set(header.map((h) => h.trim()));
  const mustExist = (column: string, role: string) => {
    if (!known.has(column.trim())) {
      errors.push(
        `La colonne « ${column} » (${role}) n'existe pas à la ligne ${description.headerRow}.`,
      );
    }
  };

  mustExist(description.territory.column, 'territoire');
  if ('column' in description.period)
    mustExist(description.period.column, 'période');
  else {
    const period = readPeriod(description.period.value);
    if (!period.valid) errors.push(period.reason);
  }

  if (description.referenceDateColumn) {
    mustExist(description.referenceDateColumn, 'date de référence');
  }
  const checkConditions = (conditions: RowCondition[] | undefined) => {
    for (const c of conditions ?? []) {
      mustExist(c.column, 'filtre');
      if ((c.equals === undefined) === (c.notEquals === undefined))
        errors.push(
          `Le filtre sur « ${c.column} » dit soit « égal à », soit « différent de ».`,
        );
    }
  };
  checkConditions(description.rowFilters);
  if (description.values.length === 0)
    errors.push('Aucune colonne de valeurs décrite.');
  const seen = new Set<string>();
  for (const { column, indicatorCode, when } of description.values) {
    mustExist(column, `valeurs de ${indicatorCode}`);
    checkConditions(when);
    // Une même colonne peut porter plusieurs indicateurs, chacun sur ses lignes.
    const key = `${column}\u0000${JSON.stringify(when ?? [])}`;
    if (seen.has(key))
      errors.push(`La colonne « ${column} » est décrite deux fois.`);
    seen.add(key);
  }
  const codes = description.values.map((v) => v.indicatorCode);
  if (new Set(codes).size !== codes.length) {
    errors.push(
      'Un même indicateur ne se lit que dans une colonne par fichier.',
    );
  }

  const first = firstDataRow(description);
  if (first <= description.headerRow) {
    errors.push(
      'La première ligne de données doit venir après la ligne d’en-têtes.',
    );
  }
  if (description.lastRow !== null && description.lastRow < first) {
    errors.push(
      'La dernière ligne lue doit venir après la première ligne de données.',
    );
  }
  return errors;
}

/** La première ligne lue comme donnée : celle déclarée, ou celle qui suit les en-têtes. */
export const firstDataRow = (d: ImportDescription) =>
  d.firstRow ?? d.headerRow + 1;
