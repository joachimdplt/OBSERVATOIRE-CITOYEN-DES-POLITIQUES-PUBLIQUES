import { canDecide } from './review';

describe('qui tranche une version', () => {
  it('une autre personne que celle qui a soumis', () => {
    expect(canDecide('approve', 'in_review', 'alice', 'bob')).toEqual({
      allowed: true,
    });
    expect(canDecide('reject', 'in_review', 'alice', 'bob')).toEqual({
      allowed: true,
    });
  });

  it('jamais celle qui a soumis ou prépublié', () => {
    expect(canDecide('approve', 'in_review', 'alice', 'alice')).toMatchObject({
      allowed: false,
    });
    expect(canDecide('approve', 'preprint', 'alice', 'alice')).toMatchObject({
      allowed: false,
    });
  });

  it('une prépublication s’approuve par un relecteur', () => {
    expect(canDecide('approve', 'preprint', 'alice', 'bob')).toEqual({
      allowed: true,
    });
    expect(canDecide('reject', 'preprint', 'alice', 'bob')).toMatchObject({
      allowed: false,
    });
  });

  it('un brouillon ou une version publiée n’attendent pas de relecture', () => {
    for (const state of ['draft', 'published', 'superseded'] as const) {
      expect(canDecide('approve', state, 'alice', 'bob')).toMatchObject({
        allowed: false,
      });
    }
  });
});
