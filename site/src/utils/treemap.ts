/** Un rectangle, en fractions de la boîte qui le contient (0 à 1). */
export type Rect = { x: number; y: number; w: number; h: number }

/**
 * Le pavage « squarified » (Bruls, Huizing, van Wijk) : chaque valeur reçoit
 * une surface proportionnelle, en rectangles aussi proches du carré que
 * possible, la plus grande en premier. La boîte a pour rapport `ratio`
 * (largeur / hauteur) ; les rectangles rendus sont en fractions de la boîte.
 */
export function squarify<T>(
  items: { value: number; item: T }[],
  ratio = 1,
): (Rect & { item: T })[] {
  const total = items.reduce((s, i) => s + i.value, 0)
  if (total <= 0) return []
  // Les surfaces en unités de la boîte (largeur ratio, hauteur 1).
  const queue = items
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((i) => ({ area: (i.value / total) * ratio, item: i.item }))
  const out: (Rect & { item: T })[] = []
  let box = { x: 0, y: 0, w: ratio, h: 1 }

  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0)
    let max = 0
    for (const r of row)
      max = Math.max(
        max,
        (side * side * r) / (s * s),
        (s * s) / (side * side * r),
      )
    return max
  }

  const place = (row: typeof queue) => {
    const s = row.reduce((a, r) => a + r.area, 0)
    if (box.w >= box.h) {
      // Une colonne à gauche.
      const width = s / box.h
      let y = box.y
      for (const r of row) {
        const h = r.area / width
        out.push({ x: box.x, y, w: width, h, item: r.item })
        y += h
      }
      box = { x: box.x + width, y: box.y, w: box.w - width, h: box.h }
    } else {
      // Une ligne en haut.
      const height = s / box.w
      let x = box.x
      for (const r of row) {
        const w = r.area / height
        out.push({ x, y: box.y, w, h: height, item: r.item })
        x += w
      }
      box = { x: box.x, y: box.y + height, w: box.w, h: box.h - height }
    }
  }

  let row: typeof queue = []
  for (const next of queue) {
    const side = Math.min(box.w, box.h)
    const areas = row.map((r) => r.area)
    if (
      row.length === 0 ||
      worst([...areas, next.area], side) <= worst(areas, side)
    )
      row.push(next)
    else {
      place(row)
      row = [next]
    }
  }
  if (row.length) place(row)

  // En fractions de la boîte.
  return out.map((r) => ({ ...r, x: r.x / ratio, w: r.w / ratio }))
}
