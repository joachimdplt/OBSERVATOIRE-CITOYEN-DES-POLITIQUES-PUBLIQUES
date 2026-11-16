import { Check, ChevronDown, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReviewItem, ReviewMethod } from '../../../types/subjects'

const METHODS: Record<ReviewMethod, string> = {
  grille: 'grille',
  voisins: 'voisins',
  classeur: 'classeur',
  modele: 'Qwen',
  titre: 'titre',
  rubrique: 'rubrique',
}

type Props = {
  item: ReviewItem
  topics: { code: string; label: string }[]
  pending: boolean
  onDecide: (code: string | null, reason: string) => void
}

/**
 * Un rangement à trancher : le texte du candidat, les sujets proposés
 * (chacun avec les méthodes qui le proposent), puis le choix et sa raison.
 * Sans raison, pas de décision : le modèle la lira la prochaine fois.
 */
export function SubjectReviewCard({ item, topics, pending, onDecide }: Props) {
  const [code, setCode] = useState<string | null | undefined>(undefined)
  const [reason, setReason] = useState('')
  const ready = code !== undefined && reason.trim().length >= 3

  // Un sujet par pastille, avec les méthodes qui le proposent.
  const proposed = new Map<string, { label: string; methods: string[] }>()
  // « Aucun sujet » n'est pas un sujet : il se lit sur le bouton qui écarte.
  const noneBy: string[] = []
  for (const p of item.proposals) {
    if (p.code === '0') noneBy.push(METHODS[p.method])
    if (!p.code || p.code === '0') continue
    const entry = proposed.get(p.code) ?? {
      label: p.label ?? p.code,
      methods: [],
    }
    entry.methods.push(METHODS[p.method])
    proposed.set(p.code, entry)
  }
  const other =
    code && !proposed.has(code) ? topics.find((t) => t.code === code) : null

  return (
    <li className="surface list-none space-y-5 p-6">
      <header className="space-y-1.5">
        <p className="text-sm font-semibold text-[#5B6470]">{item.candidate}</p>
        <h2 className="text-xl font-extrabold tracking-tight text-[#0B1A2A]">
          {item.heading}
        </h2>
      </header>

      <div className="glass-text space-y-3 text-justify text-[15px] leading-relaxed text-[#0B1A2A] hyphens-auto">
        {item.passages.map((p, i) => (
          <p key={i}>
            {p.quote}
            {p.page !== null && (
              <span className="ml-1.5 text-xs text-[#5B6470]">p. {p.page}</span>
            )}
          </p>
        ))}
        <a
          href={item.document.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-[#0B1A2A] no-underline hover:underline"
        >
          {item.document.title}
          <ExternalLink size={12} />
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[...proposed.entries()].map(([c, p]) => (
          <button
            key={c}
            type="button"
            onClick={() => setCode(c)}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
              code === c ? 'glass-dark text-white' : 'glass text-[#0B1A2A]'
            }`}
          >
            {p.label}
            <span
              className={`text-xs font-normal ${code === c ? 'text-white/60' : 'text-[#5B6470]'}`}
            >
              {p.methods.join(', ')}
            </span>
          </button>
        ))}
        <OtherTopic
          topics={topics}
          current={other ?? null}
          onPick={(c) => setCode(c)}
        />
        <button
          type="button"
          onClick={() => setCode(null)}
          className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
            code === null
              ? 'glass-dark text-white'
              : 'text-[#5B6470] hover:bg-white/60'
          }`}
        >
          Aucun sujet précis
          {noneBy.length > 0 && (
            <span
              className={`ml-2 text-xs font-normal ${code === null ? 'text-white/60' : 'text-[#5B6470]'}`}
            >
              {noneBy.join(', ')}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="field h-10 min-w-[260px] flex-1 rounded-full px-4"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Pourquoi, en une phrase (le modèle la lira)"
          aria-label="Pourquoi, en une phrase"
        />
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() => onDecide(code ?? null, reason.trim())}
          className="glass-dark inline-flex h-10 items-center rounded-full px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          Décider
        </button>
      </div>
    </li>
  )
}

/** Un autre sujet que ceux proposés : une pastille qui ouvre la grille. */
function OtherTopic({
  topics,
  current,
  onPick,
}: {
  topics: { code: string; label: string }[]
  current: { code: string; label: string } | null
  onPick: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !box.current?.contains(e.target as Node)
      )
        setOpen(false)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
          current ? 'glass-dark text-white' : 'glass text-[#0B1A2A]'
        }`}
      >
        {current ? current.label : 'Un autre sujet'}
        <ChevronDown size={15} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <ul className="glass absolute top-full left-0 z-20 mt-2 max-h-80 w-72 overflow-y-auto rounded-[18px] p-1.5">
          {topics.map((t) => (
            <li key={t.code}>
              <button
                type="button"
                onClick={() => {
                  onPick(t.code)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-sm ${
                  current?.code === t.code
                    ? 'glass-dark text-white'
                    : 'text-[#0B1A2A] hover:bg-white/70'
                }`}
              >
                <span className="flex-1">{t.label}</span>
                {current?.code === t.code && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
