import { earlierDuplicates, isCardTotal, relink, sameText } from './relink';

describe('relink', () => {
  const old = [
    'Après l’échec américain en Iran, la domination impérialiste se poursuit au Moyen-Orient Trump a subi un échec en Iran. Malgré les 30 000 bombes déversées sur ce pays, il n’a pas pu vaincre le régime iranien.',
  ];

  it('retrouve un passage sous son nouveau titre, quand un intertitre est enfin reconnu', () => {
    const r = relink(old, [
      {
        article: 'Le capitalisme, c’est la guerre',
        position: 3,
        quote:
          'Les guerres de ce siècle sont celles des capitalistes, partout dans le monde.',
      },
      {
        article:
          'Après l’échec américain en Iran, la domination impérialiste se poursuit au Moyen-Orient',
        position: 4,
        quote:
          'Trump a subi un échec en Iran. Malgré les 30 000 bombes déversées sur ce pays, il n’a pas pu vaincre le régime iranien.',
      },
    ]);
    expect(r).toEqual({
      article:
        'Après l’échec américain en Iran, la domination impérialiste se poursuit au Moyen-Orient',
      passages: [{ position: 4, covered: expect.any(Number) as number }],
    });
  });

  it('retrouve un passage que la relecture a joint à un autre', () => {
    const r = relink(
      [
        'Nous voulons interdire les licenciements dans les entreprises qui font des profits.',
      ],
      [
        {
          article: 'Face au chômage',
          position: 9,
          quote:
            'Nous voulons interdire les licenciements dans les entreprises qui font des profits. Et répartir le travail entre tous.',
        },
      ],
    );
    expect(r?.article).toBe('Face au chômage');
  });

  it('ne retrouve rien quand le texte a disparu', () => {
    expect(
      relink(old, [
        {
          article: 'Autre',
          position: 1,
          quote: 'Un tout autre texte, sans rapport avec le premier passage.',
        },
      ]),
    ).toBeNull();
  });

  it('ignore la ponctuation et les accents pour dire si un texte est inchangé', () => {
    expect(sameText(['Élection : 2027 !'], ['election 2027'])).toBe(true);
    expect(sameText(['Élection 2027'], ['Élection 2028'])).toBe(false);
  });
});

describe('earlierDuplicates', () => {
  it('garde la ligne du tableau détaillé, écarte celle du résumé', () => {
    const dup = earlierDuplicates([
      {
        position: 59,
        page: 4,
        quote: 'Suppression du visa pour soins. : 1 Mds€',
      },
      {
        position: 170,
        page: 7,
        quote: 'Suppression visa pour soins : 1,000 Mds€',
      },
    ]);
    expect([...dup]).toEqual([59]);
  });

  it('ne confond pas deux mesures voisines de la même page', () => {
    const dup = earlierDuplicates([
      {
        position: 1,
        page: 7,
        quote: 'Baisse impôt de production: suppression de la CFE : 8,800 Mds€',
      },
      {
        position: 2,
        page: 7,
        quote:
          'Baisse impôt de production: suppression totale de la CVAE : 2,600 Mds€',
      },
    ]);
    expect(dup.size).toBe(0);
  });
});

describe('isCardTotal', () => {
  it('reconnaît le total d’une case qui répète son titre', () => {
    expect(
      isCardTotal('Justice économique : 0,5 Md€', 'Justice économique'),
    ).toBe(true);
    expect(
      isCardTotal(
        'Impôt / infrastructure : 8,095 Mds€',
        'Hausse recettes · Impôt / infrastructure',
      ),
    ).toBe(true);
    expect(
      isCardTotal(
        'Fin de l’accord de 1968 avec l’Algérie : 1,300 Mds€',
        'Baisse dépenses · Immigration',
      ),
    ).toBe(false);
  });
});
