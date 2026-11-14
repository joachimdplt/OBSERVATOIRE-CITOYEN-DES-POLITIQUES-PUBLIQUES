import type { Category } from '../types/public'

/** Une catégorie lue dans le sens d'une région, si la région en précise un. */
export function categoryIn(category: Category, region?: string): Category {
  const regional = region ? category.regions?.[region] : undefined
  return {
    code: category.code,
    label: regional?.label ?? category.label,
    explanation: regional?.explanation ?? category.explanation,
  }
}
