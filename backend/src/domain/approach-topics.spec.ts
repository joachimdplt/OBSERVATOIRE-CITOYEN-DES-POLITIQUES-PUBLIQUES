import { indicatorTopic, themeTopic } from './approach-topics';

describe('le rattachement d’une démarche à la grille', () => {
  it('un indicateur se range par son nom, accents et apostrophes compris', () => {
    expect(indicatorTopic('Demandes d’asile')).toBe('9');
    expect(indicatorTopic('Détenus pour 100 places de prison')).toBe('12');
  });

  it('un thème de consultation se range par son intitulé', () => {
    expect(themeTopic('Outre-mer')).toBe('21');
    expect(themeTopic('Santé')).toBe('3');
  });

  it('ce qui n’est pas dans la table ne se range nulle part', () => {
    expect(themeTopic('Autre sujet')).toBeNull();
    expect(indicatorTopic('Un indicateur inconnu')).toBeNull();
  });
});
