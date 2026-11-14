import type { Category } from '../types/catalogue'

/**
 * La liste de catégories en texte, une ligne par catégorie ou par sens
 * régional :
 *
 *   ZIP, 1_ZIP = Zone d’intervention prioritaire
 *   ZAR, 4_ZAR = Zone d’accompagnement régional
 *   ZAR @76 = Zone d’appui régional
 *
 * Le premier code est celui de l'indicateur, les suivants les autres
 * écritures du même sens dans les fichiers ; « @76 » donne le libellé propre
 * à la région 76. Les explications déjà écrites sont gardées.
 */
export function parseCategories(
  text: string,
  current: Category[] = [],
): Category[] {
  const categories: Category[] = []
  const regional: { code: string; region: string; label: string }[] = []
  for (const line of text.split('\n')) {
    const [left, ...rest] = line.split('=')
    if (!left.trim()) continue
    const label = rest.join('=').trim()
    const region = /^\s*(\S+)\s+@(\S+)\s*$/.exec(left)
    if (region) {
      regional.push({ code: region[1], region: region[2], label })
      continue
    }
    const [code, ...aliases] = left
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
    const known = current.find((c) => c.code === code)
    categories.push({
      ...known,
      code,
      label,
      ...(aliases.length ? { aliases } : {}),
    })
  }
  for (const { code, region, label } of regional) {
    const category = categories.find((c) => c.code === code)
    if (!category) continue
    category.regions = {
      ...category.regions,
      [region]: { ...category.regions?.[region], label },
    }
  }
  return categories
}

/** L'inverse de `parseCategories`, pour reprendre une liste et la compléter. */
export function formatCategories(categories: Category[]): string {
  return categories
    .flatMap((c) => [
      `${[c.code, ...(c.aliases ?? [])].join(', ')} = ${c.label}`,
      ...Object.entries(c.regions ?? {})
        .filter(([, r]) => r.label)
        .map(([region, r]) => `${c.code} @${region} = ${r.label}`),
    ])
    .join('\n')
}
