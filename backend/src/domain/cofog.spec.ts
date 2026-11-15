import { readCofog } from './cofog';

describe('la nomenclature COFOG, lue telle que publiée', () => {
  it('lit fonctions et sous-fonctions avec leur code usuel', () => {
    expect(
      readCofog('TOTAL\tTotal\nGF07\tSanté\nGF0703\tServices hospitaliers\n'),
    ).toEqual([
      {
        code: 'GF07',
        display: '07',
        level: 1,
        parentCode: null,
        label: 'Santé',
      },
      {
        code: 'GF0703',
        display: '07.3',
        level: 2,
        parentCode: 'GF07',
        label: 'Services hospitaliers',
      },
    ]);
  });

  it('refuse une ligne qui n’est pas une fonction', () => {
    expect(() => readCofog('XX01\tAutre')).toThrow('illisible');
  });
});
