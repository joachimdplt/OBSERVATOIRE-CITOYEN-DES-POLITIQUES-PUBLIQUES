/**
 * L'échelle de la page Enjeux, du blanc au noir : blanc pour le sujet dont
 * on parle le moins, bleu nuit presque noir pour celui dont on parle le
 * plus. Monochrome, comme le reste du site : aucune teinte ne rappelle un
 * parti.
 */
const STOPS: [number, [number, number, number]][] = [
  [0, [255, 255, 255]], // blanc
  [0.4, [214, 219, 225]], // gris clair
  [0.7, [92, 104, 118]], // gris ardoise
  [1, [8, 18, 30]], // presque noir
]

/** Sur une case aussi foncée, le texte passe en blanc. */
export const isDark = (t: number) => t > 0.55

/** La couleur d'une chaleur entre 0 (le moins) et 1 (le plus). */
export function heatColor(t: number, alpha = 1): string {
  const x = Math.min(1, Math.max(0, t))
  let i = 0
  while (i < STOPS.length - 2 && x > STOPS[i + 1][0]) i++
  const [a, ca] = STOPS[i]
  const [b, cb] = STOPS[i + 1]
  const k = (x - a) / (b - a)
  const c = ca.map((v, j) => Math.round(v + (cb[j] - v) * k))
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}

/** Le dégradé complet, pour la légende. */
export const HEAT_GRADIENT = `linear-gradient(90deg, ${STOPS.map(
  ([p]) => `${heatColor(p)} ${p * 100}%`,
).join(', ')})`
