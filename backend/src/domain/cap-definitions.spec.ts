import { CAP_FR } from './cap';
import { CAP_DEFINITIONS_FR } from './cap-definitions';

describe('les définitions françaises de la grille', () => {
  const subtopics = Object.keys(CAP_FR).filter((code) => code.length >= 3);

  it('couvrent chaque sous-sujet, et rien d’autre', () => {
    expect(Object.keys(CAP_DEFINITIONS_FR).sort()).toEqual(subtopics.sort());
  });

  it('ne sont jamais vides', () => {
    for (const text of Object.values(CAP_DEFINITIONS_FR))
      expect(text.trim().length).toBeGreaterThan(10);
  });
});
