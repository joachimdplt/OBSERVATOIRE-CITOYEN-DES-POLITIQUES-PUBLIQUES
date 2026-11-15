import { chapterOf, tableOfContents } from './table-of-contents';

describe('le sommaire d’un PDF', () => {
  const toc = [
    '         Sommaire',
    'I. Garantir un monde habitable',
    '        1 Gagner la bataille du climat                          4',
    '        2 Pouvoir se loger décemment                            5',
    '        3 Garantir la liberté de se déplacer autrement          6',
    'II. Préserver la souveraineté alimentaire',
    '        4 Sanctuariser l’accès à l’eau potable                  7',
    '  5 Combattre le racisme, l’islamophobie, l’antisémitisme',
    '         et l’antitsiganisme                                    8',
  ].join('\n');
  const pages = [
    'Avant-propos',
    toc,
    'PARTIE I.',
    '1   Gagner la bataille\n    du climat\n    La seule énergie propre…',
    '2   Pouvoir se loger\n    décemment',
    '3   Garantir la liberté de se déplacer autrement',
    '4   Sanctuariser l’accès à l’eau potable',
    '5   Combattre le racisme, l’islamophobie, l’antisémitisme et l’antitsiganisme',
    'Suite du chapitre 5',
  ];

  it('donne chaque chapitre, mot pour mot, avec sa page de début', () => {
    const { chapters, pages: tocPages } = tableOfContents(pages);
    expect(tocPages).toEqual([2]);
    expect(chapters.map((c) => [c.page, c.title])).toEqual([
      [4, 'Gagner la bataille du climat'],
      [5, 'Pouvoir se loger décemment'],
      [6, 'Garantir la liberté de se déplacer autrement'],
      [7, 'Sanctuariser l’accès à l’eau potable'],
      [
        8,
        'Combattre le racisme, l’islamophobie, l’antisémitisme et l’antitsiganisme',
      ],
    ]);
    expect(chapterOf(chapters, 9)).toBe(
      'Combattre le racisme, l’islamophobie, l’antisémitisme et l’antitsiganisme',
    );
    expect(chapterOf(chapters, 3)).toBeNull();
  });

  it('un document sans sommaire n’a pas de chapitres', () => {
    expect(tableOfContents(['Un texte.', 'Un autre.'])).toEqual({
      chapters: [],
      pages: [],
    });
  });
});
