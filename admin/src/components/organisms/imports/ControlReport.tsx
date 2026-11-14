import { StatusBadge } from '../../atoms/StatusBadge'
import { IMPORT_STATES, OBSERVATION_STATUSES } from '../../../data/labels'
import type { ImportJob } from '../../../types/imports'

/**
 * Le résultat du dernier contrôle : ce qui a été écrit, et chaque anomalie.
 * Une seule anomalie bloquante, et rien n'est écrit.
 */
export function ControlReport({ job }: { job: ImportJob }) {
  const state = IMPORT_STATES[job.state]
  const blocking = job.anomalies.filter((a) => a.severity === 'blocking')
  const info = job.anomalies.filter((a) => a.severity === 'info')
  const counts = Object.entries(job.observations) as [
    keyof typeof OBSERVATION_STATUSES,
    number,
  ][]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
        {counts.length > 0 && (
          <span className="text-sm text-slate-600">
            {counts
              .map(([status, n]) => `${n} ${OBSERVATION_STATUSES[status]}`)
              .join(' · ')}
          </span>
        )}
      </div>
      {blocking.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-red-700">
            {blocking.length} anomalie{blocking.length > 1 ? 's' : ''} bloquante
            {blocking.length > 1 ? 's' : ''} : aucune valeur n’a été écrite.
          </p>
          <ul className="max-h-80 divide-y divide-red-100 overflow-auto rounded-lg border border-red-200 bg-red-50 text-sm">
            {blocking.map((a, i) => (
              <li key={i} className="px-4 py-2 text-red-800">
                {a.rowNumber !== null && (
                  <span className="font-mono text-xs">
                    ligne {a.rowNumber} ·{' '}
                  </span>
                )}
                {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {info.length > 0 && (
        <ul className="space-y-1 text-sm text-slate-600">
          {info.map((a, i) => (
            <li key={i}>
              {a.column && <span className="font-medium">{a.column} : </span>}
              {a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
