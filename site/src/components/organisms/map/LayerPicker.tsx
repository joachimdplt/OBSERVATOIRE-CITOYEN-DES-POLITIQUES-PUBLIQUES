import { PILLARS } from '../../../data/pillars'
import type { IndicatorLine } from '../../../types/public'

type Props = {
  layers: IndicatorLine[]
  active: string
  onPick: (code: string) => void
}

/** Les couches de la carte, rangées par pilier. Une seule s'affiche ; toutes se lisent dans la fiche d'une commune. */
export function LayerPicker({ layers, active, onPick }: Props) {
  return (
    <div className="space-y-4">
      {PILLARS.filter((p) => layers.some((l) => l.pillar === p.id)).map((p) => (
        <fieldset key={p.id} className="space-y-1.5">
          <legend className="mb-1 text-xs font-medium text-slate-500">
            {p.label}
          </legend>
          {layers
            .filter((l) => l.pillar === p.id)
            .map((l) => (
              <label
                key={l.code}
                className={`flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                  l.code === active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="layer"
                  className="sr-only"
                  checked={l.code === active}
                  onChange={() => onPick(l.code)}
                />
                <span className="space-y-0.5">
                  <span className="block font-medium">{l.label}</span>
                  <span
                    className={`block text-xs ${l.code === active ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    {l.producer} ·{' '}
                    {l.vintages.length > 1
                      ? `${l.vintages.length} années`
                      : l.vintage}
                    {l.status === 'preprint' ? ' · prépublication' : ''}
                  </span>
                </span>
              </label>
            ))}
        </fieldset>
      ))}
    </div>
  )
}
