import {
  type Category,
  categoryReadingIn,
  checkCategories,
  checkCategoryAmendment,
  readCategory,
} from './category';

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

describe('une catégorie lue sous un autre code, ou dans une région', () => {
  const NATIONAL: Category[] = [
    {
      code: 'ZIP',
      label: 'Zone d’intervention prioritaire',
      aliases: ['1_ZIP'],
    },
    { code: 'ZAC', label: 'Zone d’action complémentaire', aliases: ['2_ZAC'] },
    {
      code: 'ZAR',
      label: 'Zone d’accompagnement régional',
      aliases: ['4_ZAR'],
      regions: {
        '53': { explanation: 'En Bretagne : une ZAC renforcée.' },
        '76': { label: 'Zone d’appui régional' },
      },
    },
  ];

  it('un alias se range sous le code de l’indicateur', () => {
    expect(readCategory('1_ZIP', NATIONAL)).toMatchObject({ category: 'ZIP' });
    expect(readCategory('ZIP', NATIONAL)).toMatchObject({ category: 'ZIP' });
  });

  it('la région remplace le libellé ou l’explication qu’elle précise, et rien d’autre', () => {
    const [, , zar] = NATIONAL;
    expect(categoryReadingIn(zar, '53')).toEqual({
      label: 'Zone d’accompagnement régional',
      explanation: 'En Bretagne : une ZAC renforcée.',
    });
    expect(categoryReadingIn(zar, '76').label).toBe('Zone d’appui régional');
    expect(categoryReadingIn(zar, null).label).toBe(
      'Zone d’accompagnement régional',
    );
  });

  it('un alias en double ou une région mal codée est refusé', () => {
    expect(
      checkCategories([
        NATIONAL[0],
        { code: 'ZAC', label: 'x', aliases: ['1_ZIP'] },
      ]),
    ).toHaveLength(1);
    expect(
      checkCategories([
        NATIONAL[0],
        { code: 'ZAC', label: 'x', regions: { Bretagne: { label: 'y' } } },
      ]),
    ).toHaveLength(1);
  });

  it('une catégorie s’ajoute ou se complète, ne se retire ni ne se renomme', () => {
    const before = ZONAGE;
    expect(
      checkCategoryAmendment(before, [
        ...before.map((c) => ({ ...c, aliases: [`x_${c.code}`] })),
        { code: 'ZAR', label: 'Zone d’accompagnement régional' },
      ]),
    ).toEqual([]);
    expect(checkCategoryAmendment(before, before.slice(1))).toHaveLength(1);
    expect(
      checkCategoryAmendment(before, [
        { ...before[0], label: 'Autre' },
        ...before.slice(1),
      ]),
    ).toHaveLength(1);
  });
});
