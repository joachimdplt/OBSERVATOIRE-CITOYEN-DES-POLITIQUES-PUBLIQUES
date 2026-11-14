/**
 * Écrire une valeur à la française, sans l'arrondir : « 367300 » devient
 * « 367 300 », « 3.2871 » devient « 3,2871 ». L'API donne la valeur exacte ;
 * l'arrondir ici serait la changer.
 */
export function frenchNumber(value: string): string {
  if (/e/i.test(value)) return value.replace('.', ',')
  const [whole, decimals] = value.split('.')
  const sign = whole.startsWith('-') ? '-' : ''
  const digits = whole.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${digits}${decimals ? `,${decimals}` : ''}`
}

/**
 * Un ordre de grandeur, pour lire d'un coup d'œil : « 2,298 » devient
 * « 2,3 », « 34,71 » devient « 35 », « 367 300 » devient « 370 000 ». Il
 * s'affiche toujours avec la valeur exacte à côté, et ne sert à aucun calcul.
 */
export function approximately(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  const abs = Math.abs(n)
  // Arrondi au plus proche, demi vers le haut : 1,95 donne 2,0 et non 1,9,
  // l'écart d'écriture binaire de 1,95 étant compensé par Number.EPSILON.
  const half = (x: number, step: number) =>
    Math.round((x + Math.sign(x) * Number.EPSILON) / step) * step
  const rounded =
    abs < 10
      ? half(n, 0.1).toFixed(1)
      : abs < 1000
        ? half(n, 1).toFixed(0)
        : Number(n.toPrecision(2)).toFixed(0)
  return frenchNumber(rounded.replace(/\.0$/, ''))
}
