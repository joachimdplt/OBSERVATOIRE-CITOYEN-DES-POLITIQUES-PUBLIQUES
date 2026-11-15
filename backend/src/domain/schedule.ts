/** L'heure de la collecte quotidienne, à Paris. */
export const DAILY_HOUR = 6;
export const DAILY_TIME_ZONE = 'Europe/Paris';

/** Le décalage de Paris avec UTC à un instant donné, en minutes. */
function parisOffset(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DAILY_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    n('year'),
    n('month') - 1,
    n('day'),
    n('hour'),
    n('minute'),
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** La prochaine collecte : aujourd'hui à 6 h (Paris) si elle n'est pas passée, demain sinon. */
export function nextDailyRun(now: Date): Date {
  const local = new Date(now.getTime() + parisOffset(now) * 60000);
  let candidate = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    DAILY_HOUR,
  );
  for (let i = 0; i < 2; i++) {
    const at = new Date(candidate - parisOffset(new Date(candidate)) * 60000);
    if (at > now) return at;
    candidate += 24 * 3600 * 1000;
  }
  return new Date(candidate - parisOffset(new Date(candidate)) * 60000);
}
