import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../../atoms/Button'
import { StatusBadge } from '../../atoms/StatusBadge'
import { OBSERVATION_STATUSES, VERSION_STATES } from '../../../data/labels'
import type { QueueLine } from '../../../types/reviews'

type Props = {
  lines: QueueLine[]
  memberId: string
  pending: boolean
  onApprove: (id: string) => void
  onReject: (id: string, justification: string) => void
}

/**
 * Les versions qui attendent une décision, une carte par jeu de données et
 * une ligne par année. Un relecteur ne tranche jamais son propre travail :
 * l'écran le dit au lieu de proposer le bouton.
 */
export function ReviewQueue({
  lines,
  memberId,
  pending,
  onApprove,
  onReject,
}: Props) {
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  if (lines.length === 0) {
    return (
      <p className="surface p-8 text-center text-sm text-slate-500">
        Aucune version n’attend de relecture.
      </p>
    )
  }
  const datasets = [...new Set(lines.map((l) => l.dataset))]

  return (
    <ul className="space-y-4">
      {datasets.map((dataset) => {
        const versions = lines.filter((l) => l.dataset === dataset)
        const allOwn = versions.every((v) => v.submittedBy?.id === memberId)
        return (
          <li key={dataset} className="surface overflow-hidden">
            <header className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
              <p className="font-medium">{dataset}</p>
              <p className="text-xs text-slate-500">
                {versions.length} version{versions.length > 1 ? 's' : ''} en
                attente
                {allOwn
                  ? ' · votre propre travail : une autre personne la relira'
                  : ''}
              </p>
            </header>
            <ul className="divide-y divide-slate-100">
              {versions.map((l) => {
                const own = l.submittedBy?.id === memberId
                const counts = Object.entries(l.observations)
                  .map(
                    ([s, n]) =>
                      `${n} ${OBSERVATION_STATUSES[s as keyof typeof OBSERVATION_STATUSES]}`,
                  )
                  .join(' · ')
                return (
                  <li key={l.id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{l.vintage}</span>
                        <StatusBadge tone={VERSION_STATES[l.state].tone}>
                          {VERSION_STATES[l.state].label}
                        </StatusBadge>
                        <span className="text-xs text-slate-500">
                          {l.submittedBy?.name ?? 'Auteur inconnu'} · {counts}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <a
                          href={l.fileUrl}
                          className="text-slate-500 underline"
                        >
                          fichier d’origine
                        </a>
                        {l.importJobId && (
                          <Link
                            to="/imports/$jobId"
                            params={{ jobId: l.importJobId }}
                            className="underline"
                          >
                            relire la description et le contrôle
                          </Link>
                        )}
                      </div>
                    </div>
                    {own ? null : rejecting === l.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="field"
                          rows={2}
                          placeholder="Les points à reprendre (dix caractères au moins)"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            disabled={pending || reason.trim().length < 10}
                            onClick={() => onReject(l.id, reason.trim())}
                          >
                            Demander des révisions
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setRejecting(null)}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          disabled={pending}
                          onClick={() => onApprove(l.id)}
                        >
                          Approuver et publier
                        </Button>
                        {l.state === 'in_review' && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setRejecting(l.id)
                              setReason('')
                            }}
                          >
                            Demander des révisions
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}
