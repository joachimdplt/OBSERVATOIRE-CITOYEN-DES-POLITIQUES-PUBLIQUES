import { PILLARS } from '../../../data/pillars'
import type { IndicatorLine } from '../../../types/public'

type Props = {
  layers: IndicatorLine[]
  active: string
  onPick: (code: string) => void
}

/** Les couches qui posent la même question forment une entrée, dans l'ordre de leur code. */
function groupsOf(layers: IndicatorLine[]): IndicatorLine[][] {
  const groups = new Map<string, IndicatorLine[]>()
  for (const l of layers) {
    const key = l.question ?? l.code
    groups.set(key, [...(groups.get(key) ?? []), l])
  }
  return [...groups.values()].map((g) =>
    g.sort((a, b) => a.code.localeCompare(b.code)),
  )
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
          {groupsOf(layers.filter((l) => l.pillar === p.id)).map((group) => {
            const selected = group.find((l) => l.code === active)
            const l = selected ?? group[0]
            return (
              <div key={l.code} className="space-y-1.5">
                <label
                  key={l.code}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                    selected
                      ? 'bg-slate-900 text-white'
                      : 'bg-white ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="layer"
                    className="sr-only"
                    checked={selected !== undefined}
                    onChange={() => onPick(l.code)}
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium">
                      {l.question ?? l.label}
                    </span>
                    <span
                      className={`block text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}
                    >
                      {l.producer} ·{' '}
                      {l.vintages.length > 1
                        ? `${l.vintages.length} années`
                        : l.vintage}
                      {l.status === 'preprint' ? ' · prépublication' : ''}
                    </span>
                  </span>
                </label>
                {selected && group.length > 1 && (
                  <div className="flex flex-wrap gap-1 pl-1">
                    {group.map((g) => (
                      <button
                        key={g.code}
                        type="button"
                        onClick={() => onPick(g.code)}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          g.code === active
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </fieldset>
      ))}
    </div>
  )
}
