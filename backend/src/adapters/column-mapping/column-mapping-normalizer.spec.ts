import type { ImportDescription } from '../../domain/import-description';
import { ColumnMappingNormalizer } from './column-mapping-normalizer';

const HEADER = ['Code commune', 'Commune', 'APL', 'Population'];
const DESCRIPTION: ImportDescription = {
  headerRow: 1,
  firstRow: null,
  lastRow: null,
  territory: { column: 'Code commune', level: 'commune', vintage: 2026 },
  period: { value: '2024' },
  decimalSeparator: ',',
  values: [
    { column: 'APL', indicatorCode: 'apl' },
    { column: 'Population', indicatorCode: 'population' },
  ],
};
const normalize = (rows: string[][]) =>
  new ColumnMappingNormalizer().normalize(
    HEADER,
    rows.map((cells, i) => ({ rowNumber: i + 2, cells })),
    DESCRIPTION,
  );

describe('la lecture d’un tableau une ligne par territoire', () => {
  it('donne une observation par colonne de valeurs, avec sa ligne d’origine', () => {
    const { candidates, anomalies } = normalize([
      ['01001', 'L’Abergement', '3,3', '832'],
    ]);
    expect(anomalies).toEqual([]);
    expect(candidates).toEqual([
      {
        rowNumber: 2,
        indicatorCode: 'apl',
        territory: { level: 'commune', code: '01001' },
        period: '2024',
        status: 'documented',
        value: '3.3',
        category: null,
        referenceDate: null,
      },
      expect.objectContaining({ indicatorCode: 'population', value: '832' }),
    ]);
  });

  it('garde une absence comme une absence, et le résume', () => {
    const { candidates, anomalies } = normalize([['01001', 'A', '', 's']]);
    expect(candidates.map((c) => [c.status, c.value])).toEqual([
      ['not_documented', null],
      ['confidential', null],
    ]);
    expect(anomalies.map((a) => [a.severity, a.kind])).toEqual([
      ['info', 'absence_not_documented'],
      ['info', 'absence_confidential'],
    ]);
  });

  it('rend le zéro de tête et le dit', () => {
    const { candidates, anomalies } = normalize([['1001', 'A', '3,3', '832']]);
    expect(candidates[0].territory.code).toBe('01001');
    expect(anomalies[0]).toMatchObject({
      severity: 'info',
      kind: 'territory_code_repaired',
    });
  });

  it('bloque une ligne dont le code ou une valeur ne se lit pas, sans rien deviner', () => {
    const { candidates, anomalies } = normalize([
      ['Source : DREES', '', '', ''],
      ['01002', 'B', '3.300', '120'],
    ]);
    expect(anomalies).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        kind: 'invalid_territory_code',
        severity: 'blocking',
      }),
      expect.objectContaining({
        rowNumber: 3,
        column: 'APL',
        kind: 'invalid_value',
        severity: 'blocking',
      }),
    ]);
    expect(candidates.map((c) => c.indicatorCode)).toEqual(['population']);
  });

  it('ignore les lignes vides et le dit', () => {
    const { candidates, anomalies } = normalize([['', '', '', '']]);
    expect(candidates).toEqual([]);
    expect(anomalies).toEqual([
      expect.objectContaining({ kind: 'empty_rows', severity: 'info' }),
    ]);
  });

  it('lit une catégorie de la liste fermée de son indicateur, et refuse le reste', () => {
    const zonage = {
      ...DESCRIPTION,
      values: [{ column: 'APL', indicatorCode: 'zonage' }],
    };
    const readings = new Map([
      [
        'zonage',
        {
          kind: 'category' as const,
          categories: [
            { code: 'ZIP', label: 'Zone d’intervention prioritaire' },
            { code: 'ZAC', label: 'Zone d’action complémentaire' },
            { code: 'HZ', label: 'Hors zonage' },
          ],
        },
      ],
    ]);
    const { candidates, anomalies } = new ColumnMappingNormalizer().normalize(
      HEADER,
      [
        { rowNumber: 2, cells: ['13202', 'Marseille 2e', 'ZAC', ''] },
        { rowNumber: 3, cells: ['13201', 'Marseille 1er', 'Hors zone', ''] },
      ],
      zonage,
      readings,
    );
    expect(candidates).toEqual([
      expect.objectContaining({
        status: 'documented',
        value: null,
        category: 'ZAC',
      }),
    ]);
    expect(anomalies).toEqual([
      expect.objectContaining({
        rowNumber: 3,
        kind: 'invalid_value',
        severity: 'blocking',
      }),
    ]);
  });

  it('lit la date de référence de chaque ligne, et une marque « sans objet » propre au fichier', () => {
    const header = ['Code commune', 'Zonage', 'Date arrêté'];
    const zonage = {
      ...DESCRIPTION,
      referenceDateColumn: 'Date arrêté',
      notApplicableMarkers: ['NC'],
      values: [{ column: 'Zonage', indicatorCode: 'zonage' }],
    };
    const readings = new Map([
      [
        'zonage',
        {
          kind: 'category' as const,
          categories: [
            { code: '1_ZIP', label: 'Zone d’intervention prioritaire' },
            { code: '2_ZAC', label: 'Zone d’action complémentaire' },
          ],
        },
      ],
    ]);
    const { candidates, anomalies } = new ColumnMappingNormalizer().normalize(
      header,
      [
        { rowNumber: 2, cells: ['13203', '2_ZAC', '29/12/2025'] },
        { rowNumber: 3, cells: ['13055', 'NC', ''] },
        { rowNumber: 4, cells: ['01001', '1_ZIP', '31/02/2026'] },
      ],
      zonage,
      readings,
    );
    expect(
      candidates.map((c) => [
        c.territory.code,
        c.status,
        c.category,
        c.referenceDate,
      ]),
    ).toEqual([
      ['13203', 'documented', '2_ZAC', '2025-12-29'],
      ['13055', 'not_applicable', null, null],
    ]);
    expect(anomalies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowNumber: 4,
          kind: 'invalid_reference_date',
          severity: 'blocking',
        }),
      ]),
    );
  });
});
