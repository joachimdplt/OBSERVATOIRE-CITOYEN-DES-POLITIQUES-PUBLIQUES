import { isFigured, isProposal } from './programme-profile';

describe('le profil d’un programme', () => {
  it('reconnaît une proposition à son verbe d’action, et un passage chiffré', () => {
    expect(isProposal('Créer 2 000 centres de santé.')).toBe(true);
    expect(isProposal('2. Lutter contre les déserts médicaux.')).toBe(true);
    expect(isProposal('Notre système de santé est en crise.')).toBe(false);
    expect(isFigured('Augmenter de 20 % le salaire des enseignants.')).toBe(
      true,
    );
    expect(isFigured('Un plan de 100 milliards d’euros.')).toBe(true);
    expect(isFigured('Suppression du plan vélo : 0,031 Mds€')).toBe(true);
    expect(isFigured('Justice sociale : 5,6 Md€')).toBe(true);
    expect(isFigured('Réformer la justice.')).toBe(false);
  });
});
