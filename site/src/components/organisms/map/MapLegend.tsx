import { ABSENT_COLOR, OUTSIDE_COLOR } from './palette'

export type LegendEntry = { color: string; label: string }

const Swatch = ({ color }: { color: string }) => (
  <span
    className="inline-block h-3 w-5 rounded-sm ring-1 ring-slate-200"
    style={{ backgroundColor: color }}
  />
)

/**
 * La légende dit tout ce que montre la carte : chaque classe ou catégorie,
 * l'absence de valeur, et les territoires que le fichier ne couvre pas.
 */
export function MapLegend({
  title,
  entries,
  note,
}: {
  title: string
  entries: LegendEntry[]
  note?: string
}) {
  return (
    <div className="space-y-2 text-xs text-slate-600">
      <p className="font-medium text-slate-900">{title}</p>
      <ul className="space-y-1.5">
        {entries.map((e) => (
          <li key={e.label} className="flex items-center gap-2">
            <Swatch color={e.color} /> {e.label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <Swatch color={ABSENT_COLOR} /> non documenté
        </li>
        <li className="flex items-center gap-2">
          <Swatch color={OUTSIDE_COLOR} /> non couvert par le fichier
        </li>
      </ul>
      {note && <p className="text-slate-400">{note}</p>}
    </div>
  )
}
