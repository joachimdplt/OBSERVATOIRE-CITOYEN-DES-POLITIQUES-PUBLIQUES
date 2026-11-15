import {
  distinctiveVocabulary,
  isFigured,
  isProposal,
  wordsOf,
} from './programme-profile';

describe('le profil d’un programme', () => {
  it('lit les mots porteurs, sans mots vides, élisions ni nombres', () => {
    expect(wordsOf("L’hôpital public et l'école : 2 000 médecins.")).toEqual([
      'hôpital',
      'école',
      'médecins',
    ]);
  });

  it('retient les mots qu’un programme emploie nettement plus que les autres', () => {
    const own = [
      'Planification écologique et planification des transports.'.repeat(4),
    ];
    const others = [
      'Les transports et la sécurité.',
      'Les transports publics.',
    ];
    const words = distinctiveVocabulary(own, others, { minCount: 2 }).map(
      (w) => w.word,
    );
    expect(words[0]).toBe('planification');
    expect(words).not.toContain('transports');
  });

  it('reconnaît une proposition à son verbe d’action, et un passage chiffré', () => {
    expect(isProposal('Créer 2 000 centres de santé.')).toBe(true);
    expect(isProposal('2. Lutter contre les déserts médicaux.')).toBe(true);
    expect(isProposal('Notre système de santé est en crise.')).toBe(false);
    expect(isFigured('Augmenter de 20 % le salaire des enseignants.')).toBe(
      true,
    );
    expect(isFigured('Un plan de 100 milliards d’euros.')).toBe(true);
    expect(isFigured('Réformer la justice.')).toBe(false);
  });
});
