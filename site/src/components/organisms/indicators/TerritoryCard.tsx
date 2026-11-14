import { X } from 'lucide-react'
import type { Observation } from '../../../types/public'
import { ValueCell } from './ValueCell'

type Props = {
  name: string
  code: string
  observations: Observation[] | null
  unit: string
  onClose: () => void
}

/**
 * Le territoire choisi sur la carte : ses valeurs, une colonne par période,
 * côte à côte. Aucun écart n'est calculé ; le lecteur compare.
 */
export function TerritoryCard({
  name,
  code,
  observations,
  unit,
  onClose,
}: Props) {
  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{name}</p>
          <p className="font-mono text-xs text-slate-400">{code}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-slate-400 hover:text-slate-900"
        >
          <X size={16} />
        </button>
      </div>
      {observations === null ? (
        <p className="text-sm text-slate-500">Lecture…</p>
      ) : observations.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucune valeur publiée pour ce territoire.
        </p>
      ) : (
        <dl className="grid grid-cols-3 gap-3">
          {observations.map((o) => (
            <div key={o.period} className="space-y-1">
              <dt className="text-xs text-slate-500">{o.period}</dt>
              <dd className="text-xl">
                <ValueCell observation={o} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-xs text-slate-500">{unit}</p>
    </div>
  )
}
