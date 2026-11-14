/**
 * Le code d'un indicateur devient une adresse publique, citée dans des
 * articles et des fils de discussion : `/indicators/apl-medecins-generalistes`.
 * Il s'écrit en minuscules, chiffres et tirets, et ne se renomme jamais.
 */
const SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type IndicatorCodeReading =
  { valid: true; code: string } | { valid: false; reason: string };

export function readIndicatorCode(raw: string): IndicatorCodeReading {
  const code = raw.trim();
  if (code.length < 3 || code.length > 80) {
    return { valid: false, reason: 'Un code fait entre 3 et 80 caractères.' };
  }
  if (!SHAPE.test(code)) {
    return {
      valid: false,
      reason:
        'Un code s’écrit en minuscules sans accent, chiffres et tirets : apl-medecins-generalistes.',
    };
  }
  return { valid: true, code };
}
