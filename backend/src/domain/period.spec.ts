import { readPeriod } from './period';

describe('la lecture d’une période', () => {
  it('lit une année, un trimestre, un mois, une année scolaire', () => {
    expect(readPeriod('2024')).toEqual({ valid: true, period: '2024' });
    expect(readPeriod('2024.0')).toEqual({ valid: true, period: '2024' });
    expect(readPeriod('2024-t3')).toEqual({ valid: true, period: '2024-T3' });
    expect(readPeriod('2024-03')).toEqual({ valid: true, period: '2024-03' });
    expect(readPeriod('2025/2026')).toEqual({
      valid: true,
      period: '2025-2026',
    });
  });

  it('refuse une période mal écrite', () => {
    for (const raw of [
      '24',
      '2024-13',
      '2024-T5',
      '2025-2027',
      'rentrée 2025',
      '',
    ]) {
      expect(readPeriod(raw)).toMatchObject({ valid: false });
    }
  });
});
