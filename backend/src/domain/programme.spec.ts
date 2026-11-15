import {
  currentCaptures,
  pdfParagraphs,
  tableRows,
  cardRows,
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
      { heading: 'Immigration', text: 'Immigration : 2,300 Mds€' },
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

  it('range chaque ligne sous la catégorie centrée sur elle, quand un bloc en compte plusieurs', () => {
    const page = [
      'Contre-budget 2026 (base PLF 2026)                                  en Mds€',
      'Hausse recettes     Fraude       Lutte contre les fraudes                3,500',
      '                                 Timbres sur les visa touristiques       0,800',
      '                    Impôt / infrastructure   Redevance d’accès au marché   0,745',
      '                                 Taxe l’utilisation du réseau            0,550',
      '                                                                         5,595',
      'Total                                                                  88,274',
    ].join('\n');
    expect(tableRows(page)).toEqual([
      { heading: 'Fraude', text: 'Lutte contre les fraudes : 3,500 Mds€' },
      {
        heading: 'Impôt / infrastructure',
        text: 'Timbres sur les visa touristiques : 0,800 Mds€',
      },
      {
        heading: 'Impôt / infrastructure',
        text: 'Redevance d’accès au marché : 0,745 Mds€',
      },
      {
        heading: 'Impôt / infrastructure',
        text: 'Taxe l’utilisation du réseau : 0,550 Mds€',
      },
      {
        heading: 'Impôt / infrastructure',
        text: 'Impôt / infrastructure : 5,595 Mds€',
      },
      {
        heading: 'Contre-budget 2026 (base PLF 2026)',
        text: 'Total : 88,274 Mds€',
      },
    ]);
  });
});

describe('les infographies d’un PDF', () => {
  it('lit chaque carte seule : son titre, son total, chaque ligne et son montant', () => {
    const page = [
      '    DÉPENSES                              COLLECTIVITÉS',
      '   INÉFFICACES                            TERRITORIALES',
      '',
      '    +  32,4                                  +     5',
      '     Mds€                                     Mds€',
      '                    Mds€                                      Mds€',
      'Baisse de la contribution             Baisse de la',
      'Française à l’UE.   8,7               Dotation Globale de',
      '                                      Fonctionnement pour',
      'Baisse sur les agences                les Régions et les EPCI.        5',
      'et opérateurs.      7,7',
    ].join('\n');
    expect(cardRows(page)).toEqual([
      {
        heading: 'Dépenses inéfficaces',
        text: 'Dépenses inéfficaces : +32,4 Mds€',
      },
      {
        heading: 'Dépenses inéfficaces',
        text: 'Baisse de la contribution Française à l’UE. : 8,7 Mds€',
      },
      {
        heading: 'Dépenses inéfficaces',
        text: 'Baisse sur les agences et opérateurs. : 7,7 Mds€',
      },
      {
        heading: 'Collectivités territoriales',
        text: 'Collectivités territoriales : +5 Mds€',
      },
      {
        heading: 'Collectivités territoriales',
        text: 'Baisse de la Dotation Globale de Fonctionnement pour les Régions et les EPCI. : 5 Mds€',
      },
    ]);
  });

  it('un grand chiffre sans titre prend pour libellé la phrase écrite dessous', () => {
    const page = [
      'DÉPENSES',
      '',
      '- 57 Mds€                              + 7 Mds€',
      'Baisses sur des mauvaises dépenses     Nouvelles dépenses',
    ].join('\n');
    expect(cardRows(page)).toEqual([
      {
        heading: 'Dépenses',
        text: 'Baisses sur des mauvaises dépenses : -57 Mds€',
      },
      { heading: '', text: 'Nouvelles dépenses : +7 Mds€' },
    ]);
  });

  it('un texte suivi sur une seule colonne n’est pas une infographie', () => {
    expect(
      cardRows('Nous baisserons la TVA de 5 points.\nEt nous le ferons vite.'),
    ).toEqual([]);
  });
});
