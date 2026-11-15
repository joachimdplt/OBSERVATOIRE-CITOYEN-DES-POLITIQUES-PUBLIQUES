import { neighboursTopic, nearestTopic, vote } from './vote';

const v = (...xs: number[]) => new Float32Array(xs);

describe('le vote des méthodes', () => {
  it('le modèle range quand une autre méthode est d’accord', () => {
    expect(
      vote([
        { method: 'grille', code: '9' },
        { method: 'voisins', code: '5' },
        { method: 'modele', code: '9' },
      ]),
    ).toEqual({ agreed: true, code: '9' });
  });

  it('seul de son avis, le modèle laisse une personne trancher', () => {
    expect(
      vote([
        { method: 'grille', code: '15' },
        { method: 'voisins', code: '1' },
        { method: 'modele', code: '10' },
      ]),
    ).toEqual({ agreed: false });
  });

  it('la grille et les voisins d’accord sans le modèle ne suffisent pas', () => {
    expect(
      vote([
        { method: 'grille', code: '4' },
        { method: 'voisins', code: '4' },
        { method: 'modele', code: '3' },
      ]),
    ).toEqual({ agreed: false });
  });

  it('le sujet le plus proche, et les voisins hors du chapitre', () => {
    const topics = [
      { major: '4', vector: v(1, 0) },
      { major: '9', vector: v(0, 1) },
    ];
    expect(nearestTopic(v(0.1, 0.9), topics)).toBe('9');
    const known = [
      { chapter: 'a', code: '4', vector: v(0, 1) },
      { chapter: 'b', code: '9', vector: v(0.1, 0.9) },
    ];
    expect(neighboursTopic(v(0, 1), known, 'a', 1)).toBe('9');
  });
});
