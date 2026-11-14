/**
 * Cinq teintes séquentielles (viridis) : lisibles par les daltoniens, et
 * sans rapport avec la couleur d'un parti. Une absence et un territoire hors
 * du fichier ont chacun leur gris.
 */
export const CLASS_COLORS = [
  '#440154',
  '#3b528b',
  '#21918c',
  '#5ec962',
  '#fde725',
] as const
export const ABSENT_COLOR = '#cbd5e1'
export const OUTSIDE_COLOR = '#f1f5f9'

/** Les teintes de n catégories, prises à intervalles réguliers dans la même gamme. */
export function categoryColors(count: number): string[] {
  if (count <= 1) return [CLASS_COLORS[2]]
  return Array.from(
    { length: count },
    (_, i) =>
      CLASS_COLORS[Math.round((i * (CLASS_COLORS.length - 1)) / (count - 1))],
  )
}

/** L'expression de couleur d'une carte : une teinte par classe, deux gris pour le reste. */
export function fillExpression(colors: readonly string[]) {
  return [
    'match',
    ['coalesce', ['feature-state', 'cls'], -2],
    -2,
    OUTSIDE_COLOR,
    -1,
    ABSENT_COLOR,
    ...colors.flatMap((color, i) => [i, color]),
    OUTSIDE_COLOR,
  ]
}
