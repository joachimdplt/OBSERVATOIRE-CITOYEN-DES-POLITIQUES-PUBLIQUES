import { ArrowUpRight } from 'lucide-react'
import type { LiveValues } from '../../../types/public'
import { frenchNumber } from '../../../utils/number'
import { frenchDate } from '../../../utils/date'

/**
 * Les sources lues à la demande pour la commune, chez leur producteur : la
 * dernière année publiée, chaque valeur telle quelle, et la date de la
 * lecture. Un secret statistique s'écrit en toutes lettres.
 */
export function LiveSources({ data }: { data: LiveValues | null }) {
  if (!data || data.sources.length === 0) return null
  return (
    <>
      {data.sources.map(({ source, fetchedAt, values }) => {
        const periods = [...new Set(values.map((v) => v.period))].sort()
        const latest = periods.at(-1)
        const rows = values.filter((v) => v.period === latest)
        const labels = [...new Set(rows.map((v) => v.label))]
        const units = [...new Set(rows.map((v) => v.unit))]
        return (
          <section
            key={source.slug}
            className="space-y-2 border-t border-slate-100 pt-4"
          >
            <p className="text-xs font-medium text-slate-500">
              {source.title} ({latest})
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.7rem] text-slate-400">
                  <th className="font-normal" />
                  {units.map((u) => (
                    <th key={u} className="pl-2 text-right font-normal">
                      {u}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labels.map((label) => (
                  <tr key={label} className="align-baseline">
                    <td className="py-0.5 text-slate-700">{label}</td>
                    {units.map((u) => {
                      const v = rows.find(
                        (r) => r.label === label && r.unit === u,
                      )
                      return (
                        <td key={u} className="pl-2 text-right tabular-nums">
                          {v?.status === 'documented' && v.value !== null ? (
                            frenchNumber(v.value)
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              {v?.status === 'confidential'
                                ? 'secret'
                                : 'non documenté'}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400">
              {source.producer} · lu automatiquement à la source le{' '}
              {frenchDate(fetchedAt.slice(0, 10))} ·{' '}
              <a
                href={source.rowsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 underline"
              >
                lignes d’origine <ArrowUpRight size={11} />
              </a>
            </p>
          </section>
        )
      })}
    </>
  )
}
