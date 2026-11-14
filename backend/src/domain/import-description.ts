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
  territory: { column: string; level: TerritoryLevel; vintage: number };
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
  values: { column: string; indicatorCode: string }[];
};

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
  if (description.values.length === 0)
    errors.push('Aucune colonne de valeurs décrite.');
  const seen = new Set<string>();
  for (const { column, indicatorCode } of description.values) {
    mustExist(column, `valeurs de ${indicatorCode}`);
    if (seen.has(column))
      errors.push(`La colonne « ${column} » est décrite deux fois.`);
    seen.add(column);
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
