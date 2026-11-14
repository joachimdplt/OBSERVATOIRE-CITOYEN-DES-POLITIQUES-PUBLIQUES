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
