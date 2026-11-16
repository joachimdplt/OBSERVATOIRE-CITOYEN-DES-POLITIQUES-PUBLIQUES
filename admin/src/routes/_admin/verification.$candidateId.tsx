import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Notice } from '../../components/atoms/Notice'
import { CheckCard } from '../../components/organisms/checks/CheckCard'
import { TopicDock } from '../../components/organisms/checks/TopicDock'
import {
  useGridTopics,
  useNextCheck,
  useSendCheck,
} from '../../hooks/checks/useChecks'
import type { Verdict } from '../../types/checks'
import { reasonsOf } from '../../utils/api-error'
import { formatRate } from '../../utils/rate'

export const Route = createFileRoute('/_admin/verification/$candidateId')({
  component: CheckScreen,
})

/**
 * Les cartes en plein écran. Deux gestes : refuser (flèche gauche) ou
 * valider (flèche droite). Échap ramène à la liste. Le rangement ailleurs
 * d'un chapitre refusé vient dans un second temps.
 */
function CheckScreen() {
  const { candidateId } = Route.useParams()
  const navigate = useNavigate()
  const next = useNextCheck(candidateId)
  const send = useSendCheck(candidateId)
  const topics = useGridTopics()
  const progress = next.data?.progress
  const reached = progress ? progress.checked >= progress.target : false
  // L'échantillon atteint, les cartes s'arrêtent ; continuer est un choix.
  const [goOn, setGoOn] = useState(false)
  const paused = reached && !goOn
  const card = paused ? null : (next.data?.card ?? null)
  const hasMore = (next.data?.card ?? null) !== null
  const busy = send.isPending || next.isFetching

  const decide = (verdict: Verdict) => {
    if (!card || busy) return
    send.mutate({ labelId: card.id, verdict })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide('accepted')
      else if (e.key === 'ArrowLeft') decide('refused')
      else if (e.key === 'Escape') navigate({ to: '/verification' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white">
      <header className="flex items-center gap-6 border-b border-slate-100 px-6 py-3">
        <Link
          to="/verification"
          className="text-sm text-slate-400 hover:text-slate-900"
        >
          Quitter
        </Link>
        <span className="font-medium text-slate-900">
          {next.data?.candidate.name}
        </span>
        {progress && (
          <span className="ml-auto flex items-center gap-3 text-sm tabular-nums text-slate-500">
            <span className="h-1 w-40 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full bg-slate-900 transition-all"
                style={{
                  width: `${Math.min(100, (progress.checked / progress.target) * 100)}%`,
                }}
              />
            </span>
            {progress.checked} / {progress.target}
          </span>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-10">
        <Notice reasons={send.error ? reasonsOf(send.error) : []} />
        {progress && !card ? (
          <Done
            progress={progress}
            candidateId={candidateId}
            hasMore={hasMore}
            onContinue={() => setGoOn(true)}
          />
        ) : null}
        {card && <CheckCard card={card} />}
      </main>

      {card && (
        <footer className="border-t border-slate-100 bg-slate-50 px-6 py-5">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="text-center">
              <p className="text-xs text-slate-400">
                La machine a rangé ce chapitre en
              </p>
              <p className="text-xl font-semibold text-slate-900">
                {card.topic.label}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => decide('refused')}
                className="flex h-16 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-lg font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-40"
              >
                <X size={20} /> Refuser
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide('accepted')}
                className="flex h-16 items-center justify-center gap-2 rounded-xl bg-slate-900 text-lg font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                <Check size={20} /> Valider
              </button>
            </div>
            <p className="text-center text-xs text-slate-400">
              Refuser : le sujet est faux, ou le texte n’est pas une position du
              candidat.
            </p>
          </div>
          {topics.data && (
            <div className="mt-5">
              <TopicDock topics={topics.data} current={card.topic.code} />
            </div>
          )}
        </footer>
      )}
    </div>
  )
}

function Done({
  progress,
  candidateId,
  hasMore,
  onContinue,
}: {
  progress: NonNullable<ReturnType<typeof useNextCheck>['data']>['progress']
  candidateId: string
  hasMore: boolean
  onContinue: () => void
}) {
  return (
    <section className="mx-auto max-w-2xl space-y-3 pt-16 text-center">
      <p className="text-sm text-slate-400">
        {hasMore
          ? 'Échantillon atteint : la mesure tient à ± 10 points.'
          : 'Tous les rangements de ce candidat sont vérifiés.'}
      </p>
      <p className="text-2xl font-semibold text-slate-900">
        {formatRate(progress.rate)}
      </p>
      <p className="text-sm text-slate-500">
        {progress.refused} refusé{progress.refused > 1 ? 's' : ''}
        {progress.toReclass > 0 && `, dont ${progress.toReclass} à reclasser`}.
      </p>
      <div className="flex justify-center gap-3 pt-6">
        {progress.toReclass > 0 && (
          <Link
            to="/reclasser/$candidateId"
            params={{ candidateId }}
            className="flex h-12 items-center rounded-xl bg-slate-900 px-6 font-medium text-white hover:bg-slate-800"
          >
            Reclasser
          </Link>
        )}
        <Link
          to="/verification"
          className="flex h-12 items-center rounded-xl border border-slate-300 px-6 font-medium text-slate-700 hover:bg-slate-100"
        >
          Candidat suivant
        </Link>
        {hasMore && (
          <button
            type="button"
            onClick={onContinue}
            className="flex h-12 items-center rounded-xl border border-slate-300 px-6 font-medium text-slate-700 hover:bg-slate-100"
          >
            Continuer quand même
          </button>
        )}
      </div>
    </section>
  )
}
