import { readLiveRows } from './live-reading';

const LAYOUT = {
  territoryColumn: 'CODGEO_2026',
  periodColumn: 'annee',
  labelColumn: 'indicateur',
  unitColumn: 'unite_de_compte',
  values: [
    { column: 'nombre', unit: 'nombre' },
    { column: 'taux_pour_mille', unit: 'pour 1 000 habitants' },
  ],
  secret: { column: 'est_diffuse', marker: 'ndiff' },
};

describe('une lecture à la demande', () => {
  it('rend chaque valeur publiée telle quelle, avec sa ligne d’origine', () => {
    const [count, rate] = readLiveRows(
      [
        {
          __id: 249836,
          CODGEO_2026: '45290',
          annee: 2016,
          indicateur: 'Destructions et dégradations volontaires',
          unite_de_compte: 'Infraction',
          nombre: 10,
          taux_pour_mille: 5.6850483,
          est_diffuse: 'diff',
        },
      ],
      LAYOUT,
    );
    expect(count).toMatchObject({
      label: 'Destructions et dégradations volontaires',
      counted: 'Infraction',
      period: '2016',
      value: '10',
      status: 'documented',
      row: 249836,
    });
    expect(rate.value).toBe('5.6850483');
  });

  it('une ligne secrète reste secrète, et une case vide reste une absence', () => {
    const values = readLiveRows(
      [
        {
          annee: 2016,
          indicateur: 'Cambriolages de logement',
          nombre: null,
          taux_pour_mille: null,
          est_diffuse: 'ndiff',
        },
        {
          annee: 2017,
          indicateur: 'Vols avec armes',
          nombre: '',
          est_diffuse: 'diff',
        },
      ],
      LAYOUT,
    );
    expect(values.map((v) => [v.period, v.status, v.value])).toEqual([
      ['2016', 'confidential', null],
      ['2016', 'confidential', null],
      ['2017', 'not_documented', null],
      ['2017', 'not_documented', null],
    ]);
  });
});
