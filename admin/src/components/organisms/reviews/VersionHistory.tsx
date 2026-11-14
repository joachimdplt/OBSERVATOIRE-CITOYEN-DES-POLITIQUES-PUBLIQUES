import type { HistoryEvent } from '../../../types/reviews'

const ACTIONS: Record<HistoryEvent['action'], string> = {
  submitted: 'Soumise à relecture',
  preprinted: 'Prépubliée par son seul auteur',
  approved: 'Approuvée, publiée',
  rejected: 'Révisions demandées',
  superseded: 'Remplacée',
}

/** Chaque décision sur une version, signée, dans l'ordre. Rien ne s'en efface. */
export function VersionHistory({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0)
    return (
      <p className="text-sm text-slate-500">Aucune décision pour l’instant.</p>
    )
  return (
    <ol className="space-y-3 border-l border-slate-200 pl-4">
      {events.map((e, i) => (
        <li key={i} className="text-sm">
          <p>
            <span className="font-medium">{ACTIONS[e.action]}</span>
            <span className="text-slate-500">
              {' '}
              · {e.by} · {new Date(e.at).toLocaleString('fr-FR')}
            </span>
          </p>
          {e.justification && (
            <p className="mt-0.5 text-slate-600">« {e.justification} »</p>
          )}
        </li>
      ))}
    </ol>
  )
}
