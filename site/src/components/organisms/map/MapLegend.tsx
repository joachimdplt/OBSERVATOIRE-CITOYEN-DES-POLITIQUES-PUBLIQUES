import { ABSENT_COLOR, OUTSIDE_COLOR } from './palette'

export type LegendEntry = { color: string; label: string; detail?: string }

const Swatch = ({ color, wide = false }: { color: string; wide?: boolean }) => (
  <span
    className={`inline-block h-3 rounded-sm ring-1 ring-slate-200 ${wide ? 'w-full' : 'w-5 shrink-0'}`}
    style={{ backgroundColor: color }}
  />
)

type Props = {
  title: string
  entries: LegendEntry[]
  /** Pour un nombre : les deux bouts de l'échelle, en mots. */
  scale?: { low: string; high: string } | null
  note?: string
}

/**
 * La légende se lit d'abord en mots : les deux bouts de l'échelle, ou ce que
 * veut dire chaque catégorie. Les valeurs exactes restent en petit, et
 * l'absence comme les territoires hors du fichier gardent leur teinte.
 */
export function MapLegend({ title, entries, scale, note }: Props) {
  return (
    <div className="space-y-3 text-xs text-slate-600">
      <p className="font-medium text-slate-900">{title}</p>
      {scale ? (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-slate-800">
            <span>← {scale.low}</span>
            <span>{scale.high} →</span>
          </div>
          <div className="flex gap-0.5">
            {entries.map((e) => (
              <Swatch key={e.label} color={e.color} wide />
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            {entries.map((e) => (
              <span key={e.label}>{e.label}</span>
            ))}
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.label} className="flex gap-2">
              <Swatch color={e.color} />
              <span>
                <span className="block text-sm text-slate-800">{e.label}</span>
                {e.detail && (
                  <span className="block text-slate-500">{e.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ul className="space-y-1">
        <li className="flex items-center gap-2">
          <Swatch color={ABSENT_COLOR} /> pas de valeur publiée
        </li>
        <li className="flex items-center gap-2">
          <Swatch color={OUTSIDE_COLOR} /> pas encore couvert
        </li>
      </ul>
      {note && <p className="text-slate-400">{note}</p>}
    </div>
  )
}
