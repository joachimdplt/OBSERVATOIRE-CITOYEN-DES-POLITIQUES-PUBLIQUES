export type MapValue = [
  code: string,
  value: string | null,
  status: string,
  category: string | null,
  region: string | null,
]

export type Classes = {
  /** Les bornes basses de chaque classe : des valeurs réelles de territoires, jamais arrondies. */
  lower: string[]
  /** La classe de chaque territoire : 0 à 4, ou -1 pour une absence. */
  byCode: Map<string, number>
}

const COUNT = 5

/**
 * Ranger les territoires en cinq classes d'effectifs égaux (quantiles), pour
 * colorer une carte. Les bornes sont les valeurs de territoires réels, telles
 * que publiées : aucune n'est calculée ni arrondie. Une absence n'entre dans
 * aucune classe ; elle garde sa teinte à part.
 */
export function quantileClasses(values: MapValue[]): Classes {
  const documented = values
    .filter(
      (v): v is [string, string, string, string | null, string | null] =>
        v[1] !== null,
    )
    .sort((a, b) => Number(a[1]) - Number(b[1]))
  const lower: string[] = []
  const byCode = new Map<string, number>()
  if (documented.length === 0) {
    for (const [code] of values) byCode.set(code, -1)
    return { lower, byCode }
  }
  for (let k = 0; k < COUNT; k++)
    lower.push(documented[Math.floor((k * documented.length) / COUNT)][1])
  for (const [code, value] of values) {
    if (value === null) {
      byCode.set(code, -1)
      continue
    }
    let cls = 0
    for (let k = COUNT - 1; k > 0; k--) {
      if (Number(value) >= Number(lower[k])) {
        cls = k
        break
      }
    }
    byCode.set(code, cls)
  }
  return { lower, byCode }
}

/**
 * Pour un indicateur de catégorie : la classe d'un territoire est le rang de
 * sa catégorie dans la liste officielle. Rien n'est calculé.
 */
export function categoryClasses(values: MapValue[], codes: string[]): Classes {
  const byCode = new Map<string, number>()
  for (const [code, , , category] of values) {
    byCode.set(code, category === null ? -1 : codes.indexOf(category))
  }
  return { lower: [], byCode }
}
