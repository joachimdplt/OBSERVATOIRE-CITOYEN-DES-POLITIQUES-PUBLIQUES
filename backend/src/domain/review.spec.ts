import { canDecide } from './review';

describe('qui tranche une version soumise', () => {
  it('une autre personne que celle qui a soumis', () => {
    expect(canDecide('in_review', 'alice', 'bob')).toEqual({ allowed: true });
  });

  it('jamais celle qui a soumis', () => {
    expect(canDecide('in_review', 'alice', 'alice')).toMatchObject({
      allowed: false,
    });
  });

  it('seulement une version soumise', () => {
    for (const state of ['draft', 'published', 'superseded'] as const) {
      expect(canDecide(state, 'alice', 'bob')).toMatchObject({
        allowed: false,
      });
    }
  });
});
