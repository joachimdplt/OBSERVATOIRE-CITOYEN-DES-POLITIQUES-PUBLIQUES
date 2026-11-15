import { globalShares, sharesByCandidate, type Counts } from './topic-share';

const counts = (o: Record<string, Record<string, number>>): Counts =>
  new Map(Object.entries(o).map(([c, t]) => [c, new Map(Object.entries(t))]));

describe('un candidat, une voix', () => {
  it('les parts d’un candidat font 1, quelle que soit la longueur de son programme', () => {
    const s = sharesByCandidate(
      counts({ long: { a: 300, b: 100 }, court: { a: 1, b: 3 } }),
    );
    expect(s.get('long')?.get('a')).toBe(0.75);
    expect(s.get('court')?.get('b')).toBe(0.75);
  });

  it('la place globale est la moyenne des parts : un long programme ne pèse pas plus', () => {
    const s = sharesByCandidate(
      counts({ long: { a: 300, b: 100 }, court: { a: 1, b: 3 } }),
    );
    const g = globalShares(s, 2);
    expect(g.get('a')).toBeCloseTo(0.5);
    expect(g.get('b')).toBeCloseTo(0.5);
  });
});
