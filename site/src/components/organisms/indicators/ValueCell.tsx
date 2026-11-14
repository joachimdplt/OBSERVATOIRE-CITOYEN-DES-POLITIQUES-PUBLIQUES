import type { Category, Observation } from '../../../types/public'
import { frenchNumber } from '../../../utils/number'

const ABSENCES = {
  not_documented: 'non documenté',
  confidential: 'secret statistique',
  not_applicable: 'sans objet',
} as const

/**
 * La seule façon d'afficher une valeur. Elle reçoit une observation, jamais
 * un nombre : une absence s'écrit en toutes lettres, jamais zéro ; une
 * catégorie s'écrit avec le libellé de son texte officiel.
 */
export function ValueCell({
  observation,
  categories,
}: {
  observation: Pick<Observation, 'status' | 'value' | 'category'>
  categories?: Category[] | null
}) {
  if (observation.status === 'documented' && observation.category !== null) {
    const label =
      categories?.find((c) => c.code === observation.category)?.label ??
      observation.category
    return <span className="text-slate-900">{label}</span>
  }
  if (observation.status === 'documented' && observation.value !== null) {
    return (
      <span className="tabular-nums text-slate-900">
        {frenchNumber(observation.value)}
      </span>
    )
  }
  const label =
    observation.status === 'documented'
      ? 'non documenté'
      : ABSENCES[observation.status]
  return <span className="text-slate-400 italic">{label}</span>
}
