import { ObservationStatus } from '../generated/prisma/enums';

/** Une catégorie d'une liste fermée, avec le libellé de son texte officiel. */
export type Category = {
  code: string;
  label: string;
  /** Ce que la catégorie veut dire, en mots simples, repris du texte officiel. */
  explanation?: string;
  /**
   * Les autres codes sous lesquels un fichier écrit la même catégorie : le
   * fichier national écrit « 1_ZIP » ce que l'arrêté régional écrit « ZIP ».
   * La valeur se range sous le code de l'indicateur.
   */
  aliases?: string[];
  /**
   * Le sens propre à une région, par code de région : la ZAR de Bretagne
   * renforce la ZAC, celle d'Occitanie ne vaut ni ZIP ni ZAC. Le libellé et
   * l'explication de la région remplacent ceux de la catégorie.
   */
  regions?: Record<string, { label?: string; explanation?: string }>;
};

/** Le libellé et l'explication d'une catégorie dans une région donnée. */
export function categoryReadingIn(
  category: Category,
  regionCode: string | null,
): { label: string; explanation?: string } {
  const regional = regionCode ? category.regions?.[regionCode] : undefined;
  return {
    label: regional?.label ?? category.label,
    explanation: regional?.explanation ?? category.explanation,
  };
}

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
  const found = categories.find(
    (c) => c.code === code || (c.aliases ?? []).includes(code),
  );
  if (found) {
    return {
      kind: 'category',
      status: ObservationStatus.documented,
      category: found.code,
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
  const written = categories.flatMap((c) => [
    c.code.trim(),
    ...(c.aliases ?? []).map((a) => a.trim()),
  ]);
  if (new Set(written).size !== written.length)
    errors.push('Un code de catégorie ou un alias ne figure qu’une fois.');
  if (written.some((c) => c === ''))
    errors.push('Un alias vide ne désigne rien.');
  for (const c of categories) {
    for (const [region, reading] of Object.entries(c.regions ?? {})) {
      if (!/^\d{2}$/.test(region))
        errors.push(
          `« ${region} » n'est pas un code de région du COG (deux chiffres).`,
        );
      if (!reading.label?.trim() && !reading.explanation?.trim())
        errors.push(
          `La lecture de ${c.code} pour la région ${region} est vide.`,
        );
    }
  }
  if (categories.some((c) => c.label.trim() === '')) {
    errors.push('Chaque catégorie a son libellé officiel.');
  }
  return errors;
}

/**
 * Les erreurs d'une modification de la liste : une catégorie s'ajoute ou se
 * complète (alias, sens régional), elle ne se retire, ne se recode ni ne se
 * renomme jamais, parce que des valeurs publiées portent son code et son
 * libellé officiel.
 */
export function checkCategoryAmendment(
  before: Category[],
  after: Category[],
): string[] {
  const errors = checkCategories(after);
  for (const old of before) {
    const now = after.find((c) => c.code === old.code);
    if (!now) {
      errors.push(`La catégorie ${old.code} ne se retire pas.`);
      continue;
    }
    if (now.label !== old.label)
      errors.push(`Le libellé officiel de ${old.code} ne change pas.`);
    for (const alias of old.aliases ?? [])
      if (!(now.aliases ?? []).includes(alias))
        errors.push(`L'alias ${alias} de ${old.code} ne se retire pas.`);
  }
  return errors;
}
