import { ObservationStatus } from '../generated/prisma/enums';

export type DecimalSeparator = ',' | '.';

export type CellReading =
  | {
      kind: 'value';
      status: typeof ObservationStatus.documented;
      value: string;
    }
  | {
      kind: 'absence';
      status: Exclude<ObservationStatus, typeof ObservationStatus.documented>;
    }
  | { kind: 'invalid'; reason: string };

/**
 * Les marques d'absence des producteurs français. La liste est fermée : une
 * marque inconnue est une anomalie, jamais une absence devinée.
 */
const ABSENCES: Record<string, Exclude<ObservationStatus, 'documented'>> = {
  '': ObservationStatus.not_documented,
  nd: ObservationStatus.not_documented,
  'n.d.': ObservationStatus.not_documented,
  'n.d': ObservationStatus.not_documented,
  nc: ObservationStatus.not_documented,
  na: ObservationStatus.not_documented,
  '-': ObservationStatus.not_documented,
  '–': ObservationStatus.not_documented,
  '..': ObservationStatus.not_documented,
  s: ObservationStatus.confidential,
  secret: ObservationStatus.confidential,
  so: ObservationStatus.not_applicable,
  's.o.': ObservationStatus.not_applicable,
  'sans objet': ObservationStatus.not_applicable,
};

/** Espaces de milliers : ordinaire, insécable, fine insécable. */
const THOUSANDS = /[ \u00A0\u202F\u2009]/g;
const NUMBER = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;

/**
 * Lire une case de fichier.
 *
 * Le séparateur décimal est déclaré pour le fichier, jamais deviné : « 3.300 »
 * vaut 3,3 en notation anglaise et 3 300 en notation française. Avec la
 * virgule déclarée, un point est une anomalie ; avec le point, une virgule
 * l'est.
 *
 * Une case vide, « nd » ou « - » devient une absence, jamais un zéro. Un vrai
 * zéro écrit « 0 » reste un zéro.
 */
export function readCell(raw: string, decimal: DecimalSeparator): CellReading {
  const text = raw.trim();
  const absence = ABSENCES[text.toLowerCase()];
  if (absence) return { kind: 'absence', status: absence };

  const other = decimal === ',' ? '.' : ',';
  if (text.includes(other)) {
    return {
      kind: 'invalid',
      reason: `« ${raw} » contient « ${other} » alors que le séparateur décimal déclaré est « ${decimal} »`,
    };
  }
  const normalized = text.replace(THOUSANDS, '').replace(decimal, '.');
  if (!NUMBER.test(normalized)) {
    return {
      kind: 'invalid',
      reason: `« ${raw} » n'est ni un nombre ni une marque d'absence connue`,
    };
  }
  return {
    kind: 'value',
    status: ObservationStatus.documented,
    value: normalized,
  };
}
