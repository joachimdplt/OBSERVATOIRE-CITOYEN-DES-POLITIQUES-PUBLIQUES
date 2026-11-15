import { useState } from 'react'
import { Button } from '../../atoms/Button'
import type { ReviewItem, ReviewMethod } from '../../../types/subjects'

const METHODS: Record<ReviewMethod, string> = {
  grille: 'Grille (sens le plus proche)',
  voisins: 'Voisins (passages déjà rangés)',
  classeur: 'Classeur (appris sur les rangements)',
  modele: 'Modèle (Qwen3)',
  titre: 'Titre du document',
  rubrique: 'Titre et rubrique',
}

type Props = {
  item: ReviewItem
  topics: { code: string; label: string }[]
  pending: boolean
  onDecide: (code: string | null, reason: string) => void
}

/**
 * Un rangement à trancher : l'extrait tel qu'il est écrit, ce que chaque
 * méthode propose, et la décision avec sa raison. Sans raison, pas de
 * décision : c'est elle que le modèle lira la prochaine fois.
 */
export function SubjectReviewCard({ item, topics, pending, onDecide }: Props) {
  const [code, setCode] = useState<string | null | undefined>(undefined)
  const [reason, setReason] = useState('')
  const chosen = code === undefined ? null : code
  const ready = code !== undefined && reason.trim().length >= 3
  const options = [
    ...new Map(
      item.proposals
        .filter((p) => p.code)
        .map((p) => [p.code!, p.label ?? p.code!]),
    ).entries(),
  ]
  return (
    <li className="surface space-y-4 p-5">
      <header className="space-y-1">
        <p className="text-xs text-slate-500">
          {item.candidate} ·{' '}
          <a
            href={item.document.url}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {item.document.title}
          </a>
        </p>
        <h2 className="font-medium text-slate-900">{item.heading}</h2>
      </header>

      <div className="space-y-2 border-l-2 border-slate-200 pl-4 text-sm text-slate-700">
        {item.passages.map((p, i) => (
          <p key={i}>
            « {p.quote} »
            {p.page !== null && (
              <span className="text-xs text-slate-400"> · p. {p.page}</span>
            )}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">
          Ce que propose chaque méthode
        </p>
        <ul className="grid gap-1 text-sm sm:grid-cols-3 lg:grid-cols-5">
          {item.proposals.map((p) => (
            <li key={p.method} className="rounded-lg bg-slate-50 px-3 py-2">
              <span className="block text-[11px] text-slate-400">
                {METHODS[p.method]}
              </span>
              <span className="font-medium">{p.label ?? 'aucun'}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">Le bon sujet</p>
        <div className="flex flex-wrap gap-2">
          {options.map(([c, label]) => (
            <Button
              key={c}
              type="button"
              variant={chosen === c ? 'primary' : 'secondary'}
              onClick={() => setCode(c)}
            >
              {label}
            </Button>
          ))}
          <select
            aria-label="Un autre sujet"
            className="field h-9 w-auto"
            value={
              code && !options.some(([c]) => c === code) ? code : ''
            }
            onChange={(e) => setCode(e.target.value || undefined)}
          >
            <option value="">Un autre sujet…</option>
            {topics.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant={code === null ? 'primary' : 'ghost'}
            onClick={() => setCode(null)}
          >
            Aucun sujet précis
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[260px] flex-1 space-y-1.5">
          <span className="block text-xs font-medium text-slate-500">
            Pourquoi, en une phrase (le modèle la lira)
          </span>
          <input
            className="field h-9"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex. : garde d’enfants, c’est la protection sociale, pas la santé"
          />
        </label>
        <Button
          type="button"
          disabled={!ready || pending}
          onClick={() => onDecide(chosen, reason.trim())}
        >
          Décider
        </Button>
      </div>
    </li>
  )
}
