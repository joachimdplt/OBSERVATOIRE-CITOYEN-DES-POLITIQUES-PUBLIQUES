import { readCategory } from '../../domain/category';
import { readCell } from '../../domain/cell';
import type { ImportDescription } from '../../domain/import-description';
import { readPeriod } from '../../domain/period';
import { readTerritoryCode } from '../../domain/territory-code';
import {
  AnomalySeverity,
  ObservationStatus,
} from '../../generated/prisma/enums';
import type {
  Anomaly,
  CandidateObservation,
  Normalization,
  ObservationNormalizer,
  SourceRow,
  ValueReading,
} from '../../ports/observation-normalizer';

const ABSENCE_LABELS: Record<
  Exclude<ObservationStatus, 'documented'>,
  string
> = {
  not_documented: 'non documentée',
  confidential: 'sous secret statistique',
  not_applicable: 'sans objet',
};

/**
 * Le fichier « une ligne par territoire, une colonne par indicateur » :
 * la forme de la plupart des tableaux de la DREES et de la DEPP.
 *
 * Chaque ligne donne un territoire, une période, et une observation par
 * colonne de valeurs décrite. Ce qui ne se lit pas devient une anomalie
 * bloquante ; ce qui se lit mais mérite d'être su (un zéro de tête rendu, des
 * absences) devient une information, résumée par colonne.
 */
export class ColumnMappingNormalizer implements ObservationNormalizer {
  normalize(
    header: string[],
    rows: SourceRow[],
    d: ImportDescription,
    readings: Map<string, ValueReading> = new Map(),
  ): Normalization {
    const index = (column: string) =>
      header.findIndex((h) => h.trim() === column.trim());
    const territoryAt = index(d.territory.column);
    const periodAt = 'column' in d.period ? index(d.period.column) : -1;
    const fixedPeriod = 'value' in d.period ? readPeriod(d.period.value) : null;
    const valueColumns = d.values.map((v) => ({ ...v, at: index(v.column) }));

    const candidates: CandidateObservation[] = [];
    const anomalies: Anomaly[] = [];
    const blocking = (
      rowNumber: number,
      column: string,
      kind: string,
      message: string,
    ) =>
      anomalies.push({
        rowNumber,
        column,
        kind,
        severity: AnomalySeverity.blocking,
        message,
      });

    let repaired = 0;
    let emptyRows = 0;
    const absences = new Map<string, number>();

    for (const { rowNumber, cells } of rows) {
      if (cells.every((c) => c.trim() === '')) {
        emptyRows++;
        continue;
      }

      const code = readTerritoryCode(
        d.territory.level,
        cells[territoryAt] ?? '',
      );
      if (!code.valid) {
        blocking(
          rowNumber,
          d.territory.column,
          'invalid_territory_code',
          code.reason,
        );
        continue;
      }
      if (code.repaired) repaired++;

      const period = fixedPeriod ?? readPeriod(cells[periodAt] ?? '');
      if (!period.valid) {
        blocking(
          rowNumber,
          (d.period as { column: string }).column,
          'invalid_period',
          period.reason,
        );
        continue;
      }

      for (const { column, indicatorCode, at } of valueColumns) {
        const reading = readings.get(indicatorCode) ?? { kind: 'number' };
        const raw = cells[at] ?? '';
        const cell =
          reading.kind === 'category'
            ? readCategory(raw, reading.categories)
            : readCell(raw, d.decimalSeparator);
        if (cell.kind === 'invalid') {
          blocking(rowNumber, column, 'invalid_value', cell.reason);
          continue;
        }
        if (cell.kind === 'absence') {
          const key = `${column}\u0000${cell.status}`;
          absences.set(key, (absences.get(key) ?? 0) + 1);
        }
        candidates.push({
          rowNumber,
          indicatorCode,
          territory: { level: d.territory.level, code: code.code },
          period: period.period,
          status: cell.status,
          value: cell.kind === 'value' ? cell.value : null,
          category: cell.kind === 'category' ? cell.category : null,
        });
      }
    }

    const info = (column: string | null, kind: string, message: string) =>
      anomalies.push({
        rowNumber: null,
        column,
        kind,
        severity: AnomalySeverity.info,
        message,
      });
    if (repaired > 0) {
      info(
        d.territory.column,
        'territory_code_repaired',
        `${repaired} code(s) avaient perdu leur zéro de tête, rendu à la lecture (1001 → 01001).`,
      );
    }
    if (emptyRows > 0)
      info(null, 'empty_rows', `${emptyRows} ligne(s) vide(s) ignorée(s).`);
    for (const [key, count] of absences) {
      const [column, status] = key.split('\u0000') as [
        string,
        keyof typeof ABSENCE_LABELS,
      ];
      info(
        column,
        `absence_${status}`,
        `${count} valeur(s) ${ABSENCE_LABELS[status]}, gardée(s) comme telles, jamais comme zéro.`,
      );
    }
    return { candidates, anomalies };
  }
}
