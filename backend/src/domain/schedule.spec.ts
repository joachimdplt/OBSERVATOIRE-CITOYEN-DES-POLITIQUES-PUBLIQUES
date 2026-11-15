import { nextDailyRun } from './schedule';

describe('la prochaine collecte quotidienne, à 6 h heure de Paris', () => {
  it('le jour même si 6 h n’est pas passé', () => {
    // 15 novembre 2026, 3 h à Paris (UTC+1).
    expect(nextDailyRun(new Date('2026-11-15T02:00:00Z')).toISOString()).toBe(
      '2026-11-15T05:00:00.000Z',
    );
  });

  it('le lendemain sinon', () => {
    expect(nextDailyRun(new Date('2026-11-15T10:47:00Z')).toISOString()).toBe(
      '2026-11-16T05:00:00.000Z',
    );
  });

  it('en heure d’été (UTC+2)', () => {
    expect(nextDailyRun(new Date('2026-07-01T12:00:00Z')).toISOString()).toBe(
      '2026-07-02T04:00:00.000Z',
    );
  });
});
