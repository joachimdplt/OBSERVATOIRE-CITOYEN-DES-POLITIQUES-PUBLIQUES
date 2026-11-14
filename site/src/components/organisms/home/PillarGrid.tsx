import { Link } from '@tanstack/react-router'
import { PILLARS } from '../../../data/pillars'
import type { IndicatorLine } from '../../../types/public'

/** Les douze piliers, chacun avec le nombre d'indicateurs consultables. */
export function PillarGrid({ indicators }: { indicators: IndicatorLine[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PILLARS.map((p) => {
        const count = indicators.filter((i) => i.pillar === p.id).length
        return (
          <li key={p.id}>
            <Link
              to="/pillars/$pillar"
              params={{ pillar: p.id }}
              className="surface flex h-full flex-col justify-between gap-6 p-5 transition-shadow hover:shadow-md"
            >
              <span className="font-medium text-slate-900">{p.label}</span>
              <span className="text-xs text-slate-500">
                {count === 0
                  ? 'Bientôt'
                  : `${count} indicateur${count > 1 ? 's' : ''}`}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
