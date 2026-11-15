import { subjectChapters } from './subject-chapters';

const doc = { title: 'GRN-CONTRE-BUDGET-2026.pdf', url: 'https://x/a.pdf' };

describe('les chapitres d’un sujet', () => {
  it('les cartes d’un même tableau se lisent ensemble, sous leur titre commun', () => {
    expect(
      subjectChapters([
        {
          heading: 'Héritage · Dette publique (2026)',
          document: doc,
          excerpt: [{ quote: 'Dette publique (2026) : 117,9 %', page: 2 }],
          position: 2,
        },
        {
          heading: 'Héritage · Déficit public (2026)',
          document: doc,
          excerpt: [{ quote: 'Déficit public (2026) : -4,7 %', page: 2 }],
          position: 0,
        },
      ]),
    ).toEqual([
      {
        heading: 'Héritage',
        document: doc,
        excerpt: [
          { quote: 'Déficit public (2026) : -4,7 %', page: 2 },
          { quote: 'Dette publique (2026) : 117,9 %', page: 2 },
        ],
      },
    ]);
  });

  it('une carte seule garde son titre complet', () => {
    const one = {
      heading: 'Recettes fiscales · Fraude',
      document: doc,
      excerpt: [{ quote: 'Fraude : +3,5 Mds€', page: 3 }],
      position: 36,
    };
    expect(subjectChapters([one])[0].heading).toBe(
      'Recettes fiscales · Fraude',
    );
  });

  it('un même encart répété sur plusieurs pages ne se montre qu’une fois', () => {
    const banner = (url: string) => ({
      heading: 'Finances publiques',
      document: { title: url, url },
      excerpt: [
        {
          quote: 'Interdiction constitutionnelle de creuser le déficit',
          page: null,
        },
      ],
      position: 0,
    });
    expect(
      subjectChapters([banner('https://e/a'), banner('https://e/b')]),
    ).toHaveLength(1);
  });
});
