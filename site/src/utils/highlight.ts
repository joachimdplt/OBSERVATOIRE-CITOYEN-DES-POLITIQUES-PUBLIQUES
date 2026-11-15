/** Une lettre sans accent ni capitale ; « É » se lit « e ». */
const plain = (c: string) =>
  c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * Le texte découpé autour des termes cherchés, pour les surligner : les
 * morceaux pairs sont du texte, les impairs un terme trouvé. La recherche
 * ignore les accents et les capitales, comme la veille des programmes ; le
 * texte rendu reste mot pour mot.
 */
export function splitOnTerms(text: string, terms: string[]): string[] {
  const chars = [...text]
  const flat = chars.map(plain)
  // Une lettre qui ne se réduit pas à une seule (ligature) : pas de surlignage.
  if (flat.some((c) => c.length !== 1)) return [text]
  const haystack = flat.join('')
  const marks: [number, number][] = []
  for (const term of terms) {
    const needle = [...term].map(plain).join('').replace(/['’]/g, '’')
    if (!needle) continue
    const hay = haystack.replace(/['’]/g, '’')
    let from = 0
    for (;;) {
      const i = hay.indexOf(needle, from)
      if (i < 0) break
      const before = hay[i - 1] ?? ' '
      const after = hay[i + needle.length] ?? ' '
      // En mots entiers, comme la recherche.
      if (!/\p{L}/u.test(before) && !/\p{L}/u.test(after))
        marks.push([i, i + needle.length])
      from = i + needle.length
    }
  }
  if (marks.length === 0) return [text]
  marks.sort((a, b) => a[0] - b[0])
  const out: string[] = []
  let cursor = 0
  for (const [start, end] of marks) {
    if (start < cursor) continue
    out.push(
      chars.slice(cursor, start).join(''),
      chars.slice(start, end).join(''),
    )
    cursor = end
  }
  out.push(chars.slice(cursor).join(''))
  return out
}

/**
 * Un intitulé de rubrique digne d'être affiché : au moins deux mots. Les
 * lettres seules, les mots isolés venus de la mise en page d'un PDF
 * (« L », « NOUS », « chantier ») sont tus.
 */
export const meaningfulHeading = (heading: string) =>
  heading
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}{2,}/u.test(w)).length >= 2
