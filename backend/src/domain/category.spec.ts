import { checkCategories, readCategory } from './category';

const ZONAGE = [
  { code: 'ZIP', label: 'Zone d’intervention prioritaire' },
  { code: 'ZAC', label: 'Zone d’action complémentaire' },
  { code: 'HZ', label: 'Hors zonage' },
];

describe('la lecture d’une catégorie', () => {
  it('lit un code de la liste, tel quel', () => {
    expect(readCategory(' ZAC ', ZONAGE)).toEqual({
      kind: 'category',
      status: 'documented',
      category: 'ZAC',
    });
  });

  it('une case vide est une absence, pas une catégorie', () => {
    expect(readCategory('', ZONAGE)).toEqual({
      kind: 'absence',
      status: 'not_documented',
    });
  });

  it('ne devine pas une catégorie mal écrite', () => {
    expect(readCategory('zac', ZONAGE)).toMatchObject({ kind: 'invalid' });
    expect(readCategory('Zone prioritaire', ZONAGE)).toMatchObject({
      kind: 'invalid',
    });
  });
});

describe('la liste de catégories d’un indicateur', () => {
  it('tient quand chaque code est unique et libellé', () => {
    expect(checkCategories(ZONAGE)).toEqual([]);
  });

  it('refuse une liste trop courte, un code en double ou un libellé vide', () => {
    expect(checkCategories([ZONAGE[0]])).toHaveLength(1);
    expect(checkCategories([ZONAGE[0], ZONAGE[0]])).toHaveLength(1);
    expect(
      checkCategories([ZONAGE[0], { code: 'ZAC', label: ' ' }]),
    ).toHaveLength(1);
  });
});
