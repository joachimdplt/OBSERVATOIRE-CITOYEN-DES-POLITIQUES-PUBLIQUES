/**
 * L'échelle thermique de la page Enjeux, de la glace à la braise. Aucune
 * teinte ne rappelle un parti : ni rouge franc, ni bleu franc, ni vert, ni
 * violet ; un gris bleuté très pâle pour le froid, de l'ambre et de l'orange
 * brûlé pour le chaud.
 */
const STOPS: [number, [number, number, number]][] = [
  [0, [226, 233, 240]], // glace
  [0.35, [238, 236, 230]], // tiède
  [0.6, [245, 216, 160]], // sable
  [0.8, [242, 168, 72]], // ambre
  [1, [226, 104, 38]], // braise
]

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
