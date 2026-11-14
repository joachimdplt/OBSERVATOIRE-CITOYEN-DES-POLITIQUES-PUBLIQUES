import { TerritoryLevel } from '../generated/prisma/enums';

/**
 * La forme d'un code INSEE selon son niveau. Un code se lit toujours avec son
 * niveau : 84 est une région et un département.
 */
const SHAPES: Record<TerritoryLevel, RegExp> = {
  [TerritoryLevel.country]: /^FR$/,
  [TerritoryLevel.region]: /^\d{2}$/,
  [TerritoryLevel.department]: /^(\d{2}|2[AB]|97\d)$/,
  [TerritoryLevel.commune]: /^(\d{5}|2[AB]\d{3})$/,
  [TerritoryLevel.municipal_district]: /^\d{5}$/,
};

export type CodeReading =
  | { valid: true; code: string; repaired: boolean }
  | { valid: false; reason: string };

/**
 * Lire un code tel qu'il arrive d'un fichier.
 *
 * Un tableur efface le zéro de tête : 01001 devient 1001. Ce zéro se rend
 * sans ambiguïté, et la réparation est signalée (`repaired`) pour que
 * l'anomalie reste visible à l'import. Rien d'autre n'est deviné.
 */
export function readTerritoryCode(
  level: TerritoryLevel,
  raw: string,
): CodeReading {
  const code = raw.trim().toUpperCase();
  if (SHAPES[level].test(code)) return { valid: true, code, repaired: false };

  const width =
    level === TerritoryLevel.region || level === TerritoryLevel.department
      ? 2
      : 5;
  if (/^\d+$/.test(code) && code.length === width - 1) {
    const padded = `0${code}`;
    if (SHAPES[level].test(padded))
      return { valid: true, code: padded, repaired: true };
  }
  return {
    valid: false,
    reason: `« ${raw} » n'est pas un code ${LEVEL_NAMES[level]}`,
  };
}

/**
 * Lire un code suivi de son libellé, comme la DREES l'écrit : « 045 -Loiret »,
 * « 02A -Corse-du-Sud », « 971 -Guadeloupe ». Le code est ce qui précède le
 * tiret ; pour un département, le zéro de tête d'un code sur trois caractères
 * tombe (045 → 45). Le reste suit la lecture ordinaire.
 */
export function readLabelledTerritoryCode(
  level: TerritoryLevel,
  raw: string,
): CodeReading {
  const match = /^\s*([0-9A-Za-z]+)\s*-/.exec(raw);
  if (!match)
    return {
      valid: false,
      reason: `« ${raw} » ne commence pas par un code suivi d'un tiret`,
    };
  let code = match[1].toUpperCase();
  // « 000-Ensemble » : un total, pas un territoire.
  if (/^0+$/.test(code))
    return {
      valid: false,
      reason: `« ${raw} » est un total, pas un territoire`,
    };
  if (level === TerritoryLevel.department && /^0(\d{2}|2[AB])$/.test(code))
    code = code.slice(1);
  return readTerritoryCode(level, code);
}

export const LEVEL_NAMES: Record<TerritoryLevel, string> = {
  [TerritoryLevel.country]: 'de pays',
  [TerritoryLevel.region]: 'de région',
  [TerritoryLevel.department]: 'de département',
  [TerritoryLevel.commune]: 'de commune',
  [TerritoryLevel.municipal_district]: "d'arrondissement municipal",
};

/** Un territoire tel qu'un référentiel le décrit, avant d'entrer en base. */
export type TerritoryRecord = {
  level: TerritoryLevel;
  code: string;
  name: string;
  regionCode: string | null;
  departmentCode: string | null;
  communeCode: string | null;
};
