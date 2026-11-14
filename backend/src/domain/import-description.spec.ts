import { checkDescription, type ImportDescription } from './import-description';

const HEADER = ['Code commune', 'Commune', 'APL', 'Année'];
const description = (
  overrides: Partial<ImportDescription> = {},
): ImportDescription => ({
  headerRow: 1,
  lastRow: null,
  territory: { column: 'Code commune', level: 'commune', vintage: 2026 },
  period: { column: 'Année' },
  decimalSeparator: ',',
  values: [{ column: 'APL', indicatorCode: 'apl-medecins-generalistes' }],
  ...overrides,
});

describe('la description des colonnes', () => {
  it('tient quand chaque colonne existe', () => {
    expect(checkDescription(description(), HEADER)).toEqual([]);
    expect(
      checkDescription(description({ period: { value: '2024' } }), HEADER),
    ).toEqual([]);
  });

  it('nomme la colonne qui n’existe pas', () => {
    const errors = checkDescription(
      description({ values: [{ column: 'APL 2024', indicatorCode: 'apl' }] }),
      HEADER,
    );
    expect(errors).toEqual([
      "La colonne « APL 2024 » (valeurs de apl) n'existe pas à la ligne 1.",
    ]);
  });

  it('refuse une période fixe mal écrite', () => {
    expect(
      checkDescription(
        description({ period: { value: 'rentrée 2025' } }),
        HEADER,
      ),
    ).toHaveLength(1);
  });

  it('refuse une colonne ou un indicateur décrits deux fois', () => {
    const twice = description({
      values: [
        { column: 'APL', indicatorCode: 'a' },
        { column: 'APL', indicatorCode: 'a' },
      ],
    });
    expect(checkDescription(twice, HEADER)).toHaveLength(2);
  });

  it('refuse une dernière ligne avant les en-têtes', () => {
    expect(
      checkDescription(description({ headerRow: 3, lastRow: 2 }), HEADER),
    ).toHaveLength(1);
  });
});
