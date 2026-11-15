import {
  currentCaptures,
  pdfParagraphs,
  tableRows,
  splitProgramme,
  topicsOf,
} from './programme';

describe('le découpage d’un programme', () => {
  const TEXT = `L’AVENIR EN COMMUN

Santé pour tous

- Rétablir la régulation de l’installation des médecins dans les zones sur-denses.
- Recruter des médecins salariés dans les centres de santé publics de chaque
canton.

12

Logement digne
Construire 200 000 logements sociaux par an pendant cinq ans, aux normes
écologiques.`;

  it('rend chaque proposition mot pour mot, sous son intitulé', () => {
    expect(splitProgramme(TEXT)).toEqual([
      {
        heading: 'Santé pour tous',
        text: 'Rétablir la régulation de l’installation des médecins dans les zones sur-denses.',
      },
      {
        heading: 'Santé pour tous',
        text: 'Recruter des médecins salariés dans les centres de santé publics de chaque canton.',
      },
      {
        heading: 'Logement digne',
        text: 'Construire 200 000 logements sociaux par an pendant cinq ans, aux normes écologiques.',
      },
    ]);
  });

  it('range une proposition dans les enjeux dont elle porte un terme', () => {
    const topics = [
      { slug: 'medecins', terms: ['médecins', 'déserts médicaux'] },
      { slug: 'logement-social', terms: ['logements sociaux', 'HLM'] },
    ];
    expect(
      topicsOf('Construire 200 000 logements sociaux par an', topics),
    ).toEqual([{ slug: 'logement-social', term: 'logements sociaux' }]);
  });
});

describe('pdfParagraphs', () => {
  it('referme une phrase coupée par un saut de page et retire le numéro', () => {
    const text = [
      'Une ligne assez longue pour faire la largeur du texte courant',
      'qui se poursuit sur la page suivante sans',
      '',
      '12',
      '',
      'aucune coupure de sens.',
    ].join('\n');
    expect(pdfParagraphs(text)).not.toContain('12');
    expect(splitProgramme(pdfParagraphs(text))).toHaveLength(1);
  });

  it('clôt un paragraphe sur une ligne courte qui finit une phrase', () => {
    const text = [
      'Une ligne assez longue pour faire la largeur du texte courant',
      'et une autre ligne aussi longue que la première de ce passage',
      'finit ici.',
      'Un second paragraphe commence avec une ligne bien longue aussi',
      'et se termine plus loin.',
    ].join('\n');
    expect(splitProgramme(pdfParagraphs(text)).map((p) => p.text)).toEqual([
      'Une ligne assez longue pour faire la largeur du texte courant et une autre ligne aussi longue que la première de ce passage finit ici.',
      'Un second paragraphe commence avec une ligne bien longue aussi et se termine plus loin.',
    ]);
  });
});

describe('currentCaptures', () => {
  it('garde, pour chaque adresse, la lecture la plus récente', () => {
    const at = (d: string) => new Date(d);
    expect(
      currentCaptures([
        {
          id: 'a1',
          sourceRef: 'https://a.fr/p#aaaa',
          fetchedAt: at('2026-11-01'),
        },
        {
          id: 'a2',
          sourceRef: 'https://a.fr/p#bbbb',
          fetchedAt: at('2026-11-14'),
        },
        {
          id: 'b1',
          sourceRef: 'https://b.fr/p#cccc',
          fetchedAt: at('2026-11-01'),
        },
      ]),
    ).toEqual(new Set(['a2', 'b1']));
  });
});

describe('les tableaux chiffrés d’un PDF', () => {
  it('lit chaque ligne avec son montant et son unité, sous sa catégorie', () => {
    const page = [
      'Contre-budget 2026 (base PLF 2026)                                  en Mds€',
      '                       Remplacement AME par AMU                                    1,300',
      '      Immigration      Suppression visa pour soins                                 1,000',
      '                                                                                   2,300',
      '                       Suppression des CESER                                       0,040',
      '   Dépenses inutiles',
      '                       Suppression du plan vélo                                    0,031',
    ].join('\n');
    expect(tableRows(page)).toEqual([
      { heading: 'Immigration', text: 'Remplacement AME par AMU : 1,300 Mds€' },
      {
        heading: 'Immigration',
        text: 'Suppression visa pour soins : 1,000 Mds€',
      },
      {
        heading: 'Dépenses inutiles',
        text: 'Suppression des CESER : 0,040 Mds€',
      },
      {
        heading: 'Dépenses inutiles',
        text: 'Suppression du plan vélo : 0,031 Mds€',
      },
    ]);
  });
});
