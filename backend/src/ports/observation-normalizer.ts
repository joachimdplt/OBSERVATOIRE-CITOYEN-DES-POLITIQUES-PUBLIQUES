import type { Category } from '../domain/category';
import type { ImportDescription } from '../domain/import-description';
import type {
  AnomalySeverity,
  ObservationStatus,
  TerritoryLevel,
} from '../generated/prisma/enums';

export type SourceRow = { rowNumber: number; cells: string[] };

/** Une observation lue dans le fichier, avant d'être rattachée à un territoire en base. */
export type CandidateObservation = {
  rowNumber: number;
  indicatorCode: string;
  territory: { level: TerritoryLevel; code: string };
  period: string;
  status: ObservationStatus;
  value: string | null;
  category: string | null;
};

/** Ce que lit chaque indicateur décrit : un nombre, ou une catégorie de sa liste fermée. */
export type ValueReading =
  { kind: 'number' } | { kind: 'category'; categories: Category[] };

export type Anomaly = {
  rowNumber: number | null;
  column: string | null;
  kind: string;
  severity: AnomalySeverity;
  message: string;
};

export type Normalization = {
  candidates: CandidateObservation[];
  anomalies: Anomaly[];
};

/**
 * Traduit les lignes brutes d'un fichier en observations candidates, et dit
 * ce qui ne se lit pas. Un normaliseur par forme de fichier : la description
 * de colonnes aujourd'hui, un format long ou des en-têtes sur deux lignes
 * demain.
 *
 * Il ne consulte pas la base : rattacher un code à un territoire connu se
 * fait après.
 */
export interface ObservationNormalizer {
  normalize(
    header: string[],
    rows: SourceRow[],
    description: ImportDescription,
    readings: Map<string, ValueReading>,
  ): Normalization;
}

export const OBSERVATION_NORMALIZER = Symbol('ObservationNormalizer');
