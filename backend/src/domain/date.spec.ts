import { readDate } from './date';

describe('la lecture d’une date', () => {
  it('lit la forme française et la forme ISO', () => {
    expect(readDate('29/12/2025')).toEqual({ valid: true, date: '2025-12-29' });
    expect(readDate(' 2025-12-29 ')).toEqual({
      valid: true,
      date: '2025-12-29',
    });
  });

  it('refuse une date impossible ou mal écrite, sans la corriger', () => {
    expect(readDate('31/02/2026')).toMatchObject({ valid: false });
    expect(readDate('29-12-2025')).toMatchObject({ valid: false });
    expect(readDate('décembre 2025')).toMatchObject({ valid: false });
  });
});
