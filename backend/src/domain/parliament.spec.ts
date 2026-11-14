import { groupAt, readArticles, watchMatch } from './parliament';

describe('la veille des textes déposés', () => {
  const TERMS = ['déserts médicaux', 'médecin traitant', 'accès aux soins'];

  it('reconnaît un terme surveillé, sans accents ni majuscules', () => {
    expect(
      watchMatch(
        'Proposition de loi visant à lutter contre les déserts médicaux',
        TERMS,
      ),
    ).toBe('déserts médicaux');
    expect(
      watchMatch(
        'proposition de loi assurant l’accès à un MEDECIN TRAITANT',
        TERMS,
      ),
    ).toBe('médecin traitant');
  });

  it('lit un terme suivi d’une ponctuation', () => {
    expect(
      watchMatch(
        'Proposition de loi contre les déserts médicaux, d’initiative transpartisane',
        TERMS,
      ),
    ).toBe('déserts médicaux');
  });

  it('ne retient que des mots entiers', () => {
    expect(
      watchMatch('développement de la médecine nucléaire', ['médecin']),
    ).toBeNull();
  });
});

describe('le groupe d’un parlementaire à une date', () => {
  const MANDATES = [
    { group: 'Renaissance', start: '2022-06-29', end: '2024-06-09' },
    { group: 'Ensemble pour la République', start: '2024-07-19', end: null },
  ];

  it('donne le groupe du jour du dépôt', () => {
    expect(groupAt(MANDATES, '2022-10-18')).toBe('Renaissance');
    expect(groupAt(MANDATES, '2025-02-13T00:00:00.000+01:00')).toBe(
      'Ensemble pour la République',
    );
  });

  it('ne devine rien entre deux mandats', () => {
    expect(groupAt(MANDATES, '2024-07-01')).toBeNull();
  });
});

describe('les articles d’un texte déposé', () => {
  const HTML = `
    <div><p>EXPOSÉ DES MOTIFS</p><p>L’article 1<sup>er</sup> prévoit…</p></div>
    <p class="titre">PROPOSITION DE LOI</p>
    <p>Article 1<sup>er</sup></p>
    <p>I. – L’installation d’un médecin est soumise à l’autorisation&nbsp;préalable.</p>
    <p>II. – Un décret précise les conditions.</p>
    <p>– 2 –</p>
    <p>Article 2</p>
    <p>La charge est compensée par l’article 1<sup>er</sup>.</p>`;

  it('lit chaque article du dispositif, mot pour mot, sans l’exposé des motifs', () => {
    expect(readArticles(HTML)).toEqual([
      {
        article: 'Article 1er',
        text: 'I. – L’installation d’un médecin est soumise à l’autorisation préalable.\nII. – Un décret précise les conditions.',
      },
      {
        article: 'Article 2',
        text: 'La charge est compensée par l’article 1er.',
      },
    ]);
  });
});
