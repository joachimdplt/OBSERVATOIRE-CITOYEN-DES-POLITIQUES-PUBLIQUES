import { ObservationStatus } from '../generated/prisma/enums';

/** Une catégorie d'une liste fermée, avec le libellé de son texte officiel. */
export type Category = { code: string; label: string };

export type CategoryReading =
  | {
      kind: 'category';
      status: typeof ObservationStatus.documented;
      category: string;
    }
  | { kind: 'absence'; status: typeof ObservationStatus.not_documented }
  | { kind: 'invalid'; reason: string };

/**
 * Lire une case d'un indicateur de catégorie. Le code doit figurer tel quel
 * dans la liste fermée de l'indicateur (« ZIP », « ZAC », « HZ ») ; une case
 * vide est une absence ; tout le reste est une anomalie, jamais une catégorie
 * devinée.
 */
export function readCategory(
  raw: string,
  categories: Category[],
): CategoryReading {
  const code = raw.trim();
  if (code === '')
    return { kind: 'absence', status: ObservationStatus.not_documented };
  if (categories.some((c) => c.code === code)) {
    return {
      kind: 'category',
      status: ObservationStatus.documented,
      category: code,
    };
  }
  return {
    kind: 'invalid',
    reason: `« ${raw} » n'est pas une catégorie de la liste : ${categories.map((c) => c.code).join(', ')}`,
  };
}

/** Les erreurs d'une liste de catégories déclarée pour un indicateur ; vide si elle tient. */
export function checkCategories(categories: Category[]): string[] {
  const errors: string[] = [];
  if (categories.length < 2)
    errors.push('Une liste de catégories en compte au moins deux.');
  const codes = categories.map((c) => c.code.trim());
  if (codes.some((c) => c === '')) errors.push('Chaque catégorie a un code.');
  if (new Set(codes).size !== codes.length)
    errors.push('Un code de catégorie ne figure qu’une fois.');
  if (categories.some((c) => c.label.trim() === '')) {
    errors.push('Chaque catégorie a son libellé officiel.');
  }
  return errors;
}
