import { ObservationStatus } from '../generated/prisma/enums';

/**
 * Une source lue à la demande : un fichier long (une ligne par territoire,
 * période et indicateur) servi ligne par ligne par son producteur. La façon
 * de le lire s'écrit une fois, et se rejoue à chaque lecture.
 */
export type LiveLayout = {
  territoryColumn: string;
  periodColumn: string;
  /** La colonne qui nomme l'indicateur de la ligne : « Cambriolages de logement ». */
  labelColumn: string;
  /** La colonne qui dit ce qui est compté : « Infraction », « Victime ». */
  unitColumn?: string | null;
  /** Les valeurs publiées sur la ligne, chacune avec son unité. */
  values: { column: string; unit: string }[];
  /** La colonne et la marque du secret statistique : est_diffuse = « ndiff ». */
  secret?: { column: string; marker: string } | null;
};

/** Une valeur lue, telle que publiée, ou son absence et sa raison. */
export type LiveValue = {
  label: string;
  counted: string | null;
  period: string;
  unit: string;
  value: string | null;
  status: ObservationStatus;
  /** La ligne d'origine chez le producteur. */
  row: string | number | null;
};

const text = (v: unknown): string =>
  typeof v === 'string'
    ? v
    : typeof v === 'number' || typeof v === 'boolean'
      ? String(v)
      : '';

/**
 * Les valeurs d'une lecture, ligne par ligne. Une case vide est une absence ;
 * une ligne marquée secrète est un secret statistique, quoi qu'elle contienne.
 * Rien n'est calculé : chaque valeur est celle de la ligne.
 */
export function readLiveRows(
  rows: Record<string, unknown>[],
  layout: LiveLayout,
): LiveValue[] {
  const out: LiveValue[] = [];
  for (const row of rows) {
    const secret =
      layout.secret &&
      text(row[layout.secret.column]).trim() === layout.secret.marker;
    for (const { column, unit } of layout.values) {
      const raw = text(row[column]).trim();
      out.push({
        label: text(row[layout.labelColumn]).trim(),
        counted: layout.unitColumn
          ? text(row[layout.unitColumn]).trim() || null
          : null,
        period: text(row[layout.periodColumn]).trim(),
        unit,
        value: secret || raw === '' ? null : raw,
        status: secret
          ? ObservationStatus.confidential
          : raw === ''
            ? ObservationStatus.not_documented
            : ObservationStatus.documented,
        row: (row.__id as string | number | undefined) ?? null,
      });
    }
  }
  return out;
}
