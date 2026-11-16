import type { Rate } from '../types/checks'

const pct = (x: number) => `${Math.round(x * 100)} %`

/** Un taux en mots : « non mesuré » sans carte, jamais « 0 % ». */
export function formatRate(rate: Rate): string {
  if (!rate.measured) return 'non mesuré'
  const range =
    rate.low === rate.high
      ? ''
      : ` (entre ${pct(rate.low)} et ${pct(rate.high)})`
  return `${rate.right} justes sur ${rate.total} : ${pct(rate.rate)}${range}`
}
