import { agreement, doubleState, latestByPerson } from './double-check';

const v = (by: string, accepted: boolean, minute: number) => ({
  by,
  accepted,
  at: new Date(2026, 10, 16, 10, minute),
});

describe('la double vérification', () => {
  it('ne garde que le dernier avis de chaque personne', () => {
    expect(latestByPerson([v('a', true, 1), v('a', false, 2)])).toEqual([
      v('a', false, 2),
    ]);
  });

  it('dit où en est un rangement', () => {
    expect(doubleState([])).toBe('none');
    expect(doubleState([v('a', true, 1)])).toBe('single');
    // La même personne deux fois ne fait pas deux lectures.
    expect(doubleState([v('a', true, 1), v('a', true, 2)])).toBe('single');
    expect(doubleState([v('a', true, 1), v('b', true, 2)])).toBe('agreed');
    expect(doubleState([v('a', true, 1), v('b', false, 2)])).toBe('disagreed');
  });
});

describe('l’accord entre deux personnes', () => {
  it('ne mesure rien sans rangement lu deux fois', () => {
    expect(agreement([])).toBeNull();
  });

  it('calcule la part d’accord et le kappa de Cohen', () => {
    // 8 d'accord sur 10 ; marges 50 % / 50 % : kappa = (0,8 - 0,5) / 0,5.
    const pairs: [boolean, boolean][] = [
      ...Array.from({ length: 4 }, () => [true, true] as [boolean, boolean]),
      ...Array.from({ length: 4 }, () => [false, false] as [boolean, boolean]),
      [true, false],
      [false, true],
    ];
    const r = agreement(pairs)!;
    expect(r.rate).toBeCloseTo(0.8, 5);
    expect(r.kappa).toBeCloseTo(0.6, 5);
  });
});
