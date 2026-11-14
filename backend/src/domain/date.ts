export type DateReading =
  { valid: true; date: string } | { valid: false; reason: string };

/**
 * Lire une date telle qu'un fichier l'écrit : « 29/12/2025 » ou
 * « 2025-12-29 ». Une date impossible (31/02) est refusée, jamais corrigée.
 */
export function readDate(raw: string): DateReading {
  const text = raw.trim();
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const [year, month, day] = fr
    ? [fr[3], fr[2], fr[1]]
    : iso
      ? [iso[1], iso[2], iso[3]]
      : [];
  if (!year)
    return {
      valid: false,
      reason: `« ${raw} » n'est pas une date : 29/12/2025 ou 2025-12-29`,
    };
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return { valid: false, reason: `« ${raw} » n'existe pas au calendrier` };
  }
  return { valid: true, date: `${year}-${month}-${day}` };
}
