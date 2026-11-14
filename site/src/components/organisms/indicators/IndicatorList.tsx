import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { PublicationBadge } from '../../molecules/PublicationBadge'
import { pillarLabel } from '../../../data/pillars'
import type { IndicatorLine } from '../../../types/public'

export function IndicatorList({ indicators }: { indicators: IndicatorLine[] }) {
  if (indicators.length === 0) {
    return (
      <p className="surface p-8 text-center text-sm text-slate-500">
        Aucun indicateur n’est encore consultable ici.
      </p>
    )
  }
  return (
    <ul className="surface divide-y divide-slate-100">
      {indicators.map((i) => (
        <li key={i.code}>
          <Link
            to="/indicators/$code"
            params={{ code: i.code }}
            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
          >
            <span className="min-w-0 space-y-1">
              <span className="block font-medium text-slate-900">
                {i.label}
              </span>
              <span className="block text-xs text-slate-500">
                {pillarLabel(i.pillar)} · {i.producer} · millésime {i.vintage}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <PublicationBadge
                status={i.status}
                label={i.status === 'published' ? 'Publiée' : 'Prépublication'}
              />
              <ChevronRight size={16} className="text-slate-300" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
