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
 * Les versions qui attendent une décision. Un relecteur ne tranche jamais
 * son propre travail : l'écran le dit au lieu de proposer le bouton.
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
  return (
    <ul className="space-y-3">
      {lines.map((l) => {
        const own = l.submittedBy?.id === memberId
        const counts = Object.entries(l.observations)
          .map(
            ([s, n]) =>
              `${n} ${OBSERVATION_STATUSES[s as keyof typeof OBSERVATION_STATUSES]}`,
          )
          .join(' · ')
        return (
          <li key={l.id} className="surface space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {l.dataset} · {l.vintage}
                  <StatusBadge tone={VERSION_STATES[l.state].tone}>
                    {VERSION_STATES[l.state].label}
                  </StatusBadge>
                </p>
                <p className="text-xs text-slate-500">
                  {l.submittedBy?.name ?? 'Auteur inconnu'} · {counts}
                </p>
                <a
                  href={l.fileUrl}
                  className="text-xs text-slate-500 underline"
                >
                  {l.fileName}, chez le producteur
                </a>
              </div>
              {l.importJobId && (
                <Link
                  to="/imports/$jobId"
                  params={{ jobId: l.importJobId }}
                  className="text-sm underline"
                >
                  Relire la description et le contrôle
                </Link>
              )}
            </div>
            {own ? (
              <p className="text-sm text-slate-500">
                Votre propre travail : une autre personne le relira.
              </p>
            ) : rejecting === l.id ? (
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
                  <Button variant="ghost" onClick={() => setRejecting(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button disabled={pending} onClick={() => onApprove(l.id)}>
                  Approuver et publier
                </Button>
                {l.state === 'in_review' && (
                  <Button
                    variant="secondary"
                    onClick={() => (setRejecting(l.id), setReason(''))}
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
  )
}
