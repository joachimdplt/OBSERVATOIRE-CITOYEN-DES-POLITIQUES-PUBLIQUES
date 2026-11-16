import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Notice } from '../../components/atoms/Notice'
import { CheckCard } from '../../components/organisms/checks/CheckCard'
import { TopicDock } from '../../components/organisms/checks/TopicDock'
import {
  useGridTopics,
  useNextReclass,
  useSendReclass,
} from '../../hooks/checks/useChecks'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/reclasser/$candidateId')({
  component: ReclassScreen,
})

/**
 * La seconde couche : les chapitres refusés, un par un. La personne choisit
 * le bon sujet dans le panneau, puis confirme ; ou dit que le texte n'est
 * pas une position du candidat. Échap ramène à la liste.
 */
function ReclassScreen() {
  const { candidateId } = Route.useParams()
  const navigate = useNavigate()
  const next = useNextReclass(candidateId)
  const send = useSendReclass(candidateId)
  const topics = useGridTopics()
  const card = next.data?.card ?? null
  const busy = send.isPending || next.isFetching
  const [picked, setPicked] = useState<{ id: string; code: string } | null>(
    null,
  )
  // Le choix vaut pour la carte où il a été fait.
  const code = picked && card && picked.id === card.id ? picked.code : null
  const pickedLabel = topics.data?.find((t) => t.code === code)?.label

  // L'explication vaut pour la carte où elle a été écrite.
  const [note, setNote] = useState<{ id: string; text: string } | null>(null)
  const reason = note && card && note.id === card.id ? note.text : ''

  const decide = (choice: string | null, noTopic = false) => {
    if (!card || busy) return
    send.mutate({ labelId: card.id, code: choice, noTopic, reason })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate({ to: '/verification' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#F4F6F8]">
      <header className="glass-bar flex items-center gap-6 px-6 py-3">
        <Link
          to="/verification"
          className="text-sm text-slate-400 hover:text-slate-900"
        >
          Quitter
        </Link>
        <span className="font-medium text-slate-900">
          {next.data?.candidate.name}
        </span>
        {next.data && (
          <span className="ml-auto text-sm text-slate-500">
            {next.data.left} à reclasser
          </span>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-10">
        <Notice reasons={send.error ? reasonsOf(send.error) : []} />
        {next.data && !card && (
          <section className="mx-auto max-w-2xl space-y-3 pt-16 text-center">
            <p className="text-2xl font-semibold text-slate-900">
              Plus rien à reclasser.
            </p>
            <p className="text-sm text-slate-500">
              Chaque chapitre refusé de ce candidat est rangé dans le bon sujet
              ou écarté.
            </p>
            <div className="pt-6">
              <Link
                to="/verification"
                className="inline-flex h-12 items-center rounded-xl bg-slate-900 px-6 font-medium text-white hover:bg-slate-800"
              >
                Retour à la liste
              </Link>
            </div>
          </section>
        )}
        {card && <CheckCard card={card} />}
      </main>

      {card && (
        <footer className="glass-bar border-t border-white/70 px-6 py-5">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="text-center">
              <p className="text-xs text-slate-400">
                Refusé en {card.topic.label}. Le bon sujet :
              </p>
              <p className="text-xl font-semibold text-slate-900">
                {pickedLabel ?? 'choisissez-le dans le panneau'}
              </p>
            </div>
            <label className="block text-left">
              <span className="text-xs text-slate-500">
                Pourquoi ? Le modèle relit cette explication quand il range
                un passage proche.
              </span>
              <textarea
                value={reason}
                onChange={(e) =>
                  setNote({ id: card.id, text: e.target.value })
                }
                onKeyDown={(e) => e.stopPropagation()}
                rows={2}
                placeholder="Ex. : la répression des manifestations relève des libertés, pas de l’emploi."
                className="glass mt-1 w-full resize-none rounded-2xl px-4 py-2 text-sm text-[#0B1A2A] outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(null)}
                className="glass flex h-16 items-center justify-center rounded-full px-4 text-base font-semibold text-[#0B1A2A] hover:bg-white/80 disabled:opacity-40"
              >
                Pas une position du candidat
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(null, true)}
                title="Sa position, mais elle ne vise aucune politique publique : une analyse, un appel, un slogan."
                className="glass flex h-16 items-center justify-center rounded-full px-4 text-base font-semibold text-[#0B1A2A] hover:bg-white/80 disabled:opacity-40"
              >
                Sans sujet de politique publique
              </button>
              <button
                type="button"
                disabled={busy || !code}
                onClick={() => decide(code)}
                className="glass-dark flex h-16 items-center justify-center rounded-full px-4 text-base font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                Ranger ici
              </button>
            </div>
          </div>
          {topics.data && (
            <div className="mt-5">
              <TopicDock
                topics={topics.data}
                current={card.topic.code}
                selected={code}
                allowCurrent
                onPick={(c) => setPicked({ id: card.id, code: c })}
              />
            </div>
          )}
        </footer>
      )}
    </div>
  )
}
