import { isProposal } from './programme-profile';

describe('le profil d’un programme', () => {
  it('reconnaît une proposition à son verbe d’action', () => {
    expect(isProposal('Créer 2 000 centres de santé.')).toBe(true);
    expect(isProposal('2. Lutter contre les déserts médicaux.')).toBe(true);
    expect(isProposal('Notre système de santé est en crise.')).toBe(false);
  });
});
