import type { Category, Observation } from '../../../types/public'
import { ValueCell } from './ValueCell'

/** Les valeurs, une ligne par territoire et période, avec la ligne du fichier d'origine. */
export function ObservationsTable({
  observations,
  unit,
  categories,
}: {
  observations: Observation[]
  unit: string
  categories?: Category[] | null
}) {
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-xs text-slate-500">
          <tr>
            <th className="px-5 py-3 font-medium">Territoire</th>
            <th className="px-5 py-3 font-medium">Code</th>
            <th className="px-5 py-3 font-medium">Période</th>
            <th className="px-5 py-3 font-medium">Millésime</th>
            <th className="px-5 py-3 text-right font-medium">
              Valeur ({unit})
            </th>
            <th className="px-5 py-3 text-right font-medium">
              Ligne du fichier
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {observations.map((o) => (
            <tr key={`${o.territory.level}-${o.territory.code}-${o.period}`}>
              <td className="px-5 py-2.5">{o.territory.name}</td>
              <td className="px-5 py-2.5 font-mono text-xs text-slate-500">
                {o.territory.code}
              </td>
              <td className="px-5 py-2.5 tabular-nums">{o.period}</td>
              <td className="px-5 py-2.5 tabular-nums text-slate-500">
                {o.vintage}
              </td>
              <td className="px-5 py-2.5 text-right">
                <ValueCell observation={o} categories={categories} />
              </td>
              <td className="px-5 py-2.5 text-right tabular-nums text-slate-400">
                {o.sourceRow}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
