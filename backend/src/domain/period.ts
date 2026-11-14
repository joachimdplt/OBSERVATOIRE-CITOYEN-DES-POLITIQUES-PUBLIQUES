export type PeriodReading =
  { valid: true; period: string } | { valid: false; reason: string };

/**
 * Lire une période. Quatre formes, écrites toujours de la même façon :
 *   2024        une année
 *   2024-T3     un trimestre
 *   2024-03     un mois
 *   2025-2026   une année scolaire ou une campagne, deux années consécutives
 */
export function readPeriod(raw: string): PeriodReading {
  const text = raw.trim().toUpperCase().replace(/\s+/g, '').replace('/', '-');
  // Un tableur écrit 2024 en 2024.0 quand la colonne est numérique.
  const year = text.replace(/\.0$/, '');

  if (/^\d{4}$/.test(year)) return { valid: true, period: year };
  if (/^\d{4}-T[1-4]$/.test(text)) return { valid: true, period: text };
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text))
    return { valid: true, period: text };

  const span = /^(\d{4})-(\d{4})$/.exec(text);
  if (span && Number(span[2]) === Number(span[1]) + 1)
    return { valid: true, period: text };

  return {
    valid: false,
    reason: `« ${raw} » n'est pas une période : 2024, 2024-T3, 2024-03 ou 2025-2026`,
  };
}
