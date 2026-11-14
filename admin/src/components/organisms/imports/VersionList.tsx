import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { StatusBadge } from '../../atoms/StatusBadge'
import { IMPORT_STATES, VERSION_STATES } from '../../../data/labels'
import type { VersionLine } from '../../../types/imports'

const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR')

/** Toutes les versions d'un jeu, la plus récente en premier ; aucune effacée. */
export function VersionList({ versions }: { versions: VersionLine[] }) {
  if (versions.length === 0) {
    return (
      <p className="surface p-6 text-sm text-slate-500">
        Aucun fichier déposé pour ce jeu.
      </p>
    )
  }
  return (
    <ul className="surface divide-y divide-slate-100">
      {versions.map((v) => {
        const state = VERSION_STATES[v.state]
        const row = (
          <>
            <span className="min-w-0 space-y-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Millésime {v.vintage}</span>
                <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                {v.importJob && v.state === 'draft' && (
                  <StatusBadge tone={IMPORT_STATES[v.importJob.state].tone}>
                    {IMPORT_STATES[v.importJob.state].label}
                  </StatusBadge>
                )}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {v.fileName} · déposé le {day(v.depositedAt)} par{' '}
                {v.depositedBy}
                {v.importJob ? ` · ${v.importJob.rowCount} lignes` : ''}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-slate-300" />
          </>
        )
        return (
          <li key={v.id}>
            {v.importJob ? (
              <Link
                to="/imports/$jobId"
                params={{ jobId: v.importJob.id }}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
              >
                {row}
              </Link>
            ) : (
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                {row}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
