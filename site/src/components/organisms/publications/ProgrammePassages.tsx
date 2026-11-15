import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import type { TopicSheet } from '../../../types/public'
import { frenchDate } from '../../../utils/date'
import { meaningfulHeading } from '../../../utils/highlight'
import { QuoteText } from '../../molecules/QuoteText'

type Candidate = TopicSheet['candidates'][number]

const MUTED = 'text-[#5B6470]'
/** Les premiers passages d'un candidat ; les autres se déplient. */
const SHOWN = 3

const STATUS = {
  complete: 'Programme complet',
  partial: 'Documents partiels',
  none: 'Rien de publié',
} as const

const surname = (name: string) => name.split(' ').slice(1).join(' ') || name

/** Défile en douceur jusqu'à la carte d'un candidat, sous l'en-tête. */
export function goTo(e: { preventDefault: () => void }, slug: string) {
  const target = document.getElementById(`candidat-${slug}`)
  if (!target) return
  e.preventDefault()
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#candidat-${slug}`)
}

function Avatar({ c, size }: { c: Candidate; size: number }) {
  return (
    <span
      className="block shrink-0 overflow-hidden bg-[#E8ECF0]"
      style={{ width: size, height: size, borderRadius: size / 3.5 }}
    >
      {c.photo && (
        <img
          src={c.photo}
          alt=""
          className="size-full object-cover object-top grayscale"
        />
      )}
    </span>
  )
}

/**
 * Un sujet dans les programmes publiés. Une barre de photos mène à chaque
 * candidat ; puis une carte par candidat, celui qui en parle le plus d'abord, avec ses
 * passages mot pour mot, le terme trouvé surligné, la rubrique et le
 * document. Les programmes sans passage sont nommés à la fin : l'absence d'un
 * terme ne dit pas l'absence de position.
 */
export function ProgrammePassages({ topic }: { topic: TopicSheet }) {
  // Celui qui en parle le plus d'abord ; à égalité, l'ordre alphabétique.
  const speaking = topic.candidates
    .filter((c) => c.passages.length > 0)
    .sort(
      (a, b) =>
        b.passages.length - a.passages.length ||
        surname(a.name).localeCompare(surname(b.name), 'fr'),
    )
  const silent = topic.candidates.filter((c) => c.passages.length === 0)
  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          Dans les programmes
        </h2>
        <p className={`mt-3 flex flex-wrap items-center gap-2 ${MUTED}`}>
          <span>Passages contenant</span>
          {topic.terms.map((t) => (
            <span
              key={t}
              className="rounded-full bg-white px-2.5 py-0.5 text-[0.85rem] font-semibold text-[#0B1A2A]"
            >
              {t}
            </span>
          ))}
          <span className="text-[0.85rem]">
            · collectés automatiquement, non relus
          </span>
        </p>

        <nav className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-2">
          {speaking.map((c) => (
            <a
              key={c.slug}
              href={`#candidat-${c.slug}`}
              onClick={(e) => goTo(e, c.slug)}
              className="flex shrink-0 items-center gap-2 rounded-full bg-white py-1 pr-3.5 pl-1 text-[0.88rem] font-bold text-[#0B1A2A] no-underline hover:shadow-[0_4px_16px_rgba(11,26,42,0.1)]"
            >
              <Avatar c={c} size={30} />
              {surname(c.name)}
              <span className={`font-semibold tabular-nums ${MUTED}`}>
                {c.passages.length}
              </span>
            </a>
          ))}
        </nav>

        <ul className="mt-6 space-y-5">
          {speaking.map((c) => (
            <CandidateCard key={c.slug} c={c} terms={topic.terms} />
          ))}
        </ul>

        {silent.length > 0 && (
          <div className="mt-5 rounded-[28px] bg-white p-6 md:p-8">
            <p className="font-extrabold text-[#0B1A2A]">
              Aucun passage avec ces termes
            </p>
            <p className={`mt-1 text-[0.9rem] ${MUTED}`}>
              Leur programme peut traiter le sujet avec d’autres mots.
            </p>
            <ul className="mt-4 flex flex-wrap gap-3">
              {silent.map((c) => (
                <li key={c.slug}>
                  <Link
                    to="/candidats/$slug"
                    params={{ slug: c.slug }}
                    className="flex items-center gap-2.5 rounded-full bg-[#F4F6F8] py-1 pr-4 pl-1 text-[0.9rem] font-bold text-[#0B1A2A] no-underline hover:underline"
                  >
                    <Avatar c={c} size={34} />
                    {c.name}
                    <span className={`text-[0.8rem] font-semibold ${MUTED}`}>
                      {STATUS[c.programmeStatus].toLowerCase()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function CandidateCard({ c, terms }: { c: Candidate; terms: string[] }) {
  const [all, setAll] = useState(false)
  const shown = all ? c.passages : c.passages.slice(0, SHOWN)
  const rest = c.passages.length - SHOWN
  return (
    <li
      id={`candidat-${c.slug}`}
      className="scroll-mt-32 rounded-[28px] bg-white p-5 md:p-8"
    >
      <div className="flex items-center gap-4">
        <Avatar c={c} size={64} />
        <div className="min-w-0 flex-1">
          <Link
            to="/candidats/$slug"
            params={{ slug: c.slug }}
            className="text-[1.3rem] leading-tight font-extrabold tracking-[-0.02em] text-[#0B1A2A] no-underline hover:underline"
          >
            {c.name}
          </Link>
          <p className={`mt-0.5 truncate text-[0.88rem] ${MUTED}`}>{c.party}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[1.8rem] leading-none font-extrabold text-[#0B1A2A] tabular-nums">
            {c.passages.length}
          </p>
          <p className={`text-[0.75rem] ${MUTED}`}>
            passage{c.passages.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <p className="mt-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold ${
            c.programmeStatus === 'complete'
              ? 'bg-[#0B1A2A] text-white'
              : 'text-[#0B1A2A] ring-1 ring-[#0B1A2A]/25'
          }`}
        >
          {STATUS[c.programmeStatus]}
        </span>
      </p>

      <ol className="mt-6 space-y-6 border-l-2 border-[#0B1A2A]/10 pl-5 md:pl-7">
        {shown.map((p, i) => (
          <li key={i}>
            {meaningfulHeading(p.heading) && (
              <p className={`mb-1.5 text-[0.82rem] font-semibold ${MUTED}`}>
                {p.heading}
              </p>
            )}
            <QuoteText text={p.quote} terms={terms} />
            <a
              href={p.document.url}
              target="_blank"
              rel="noreferrer"
              className={`mt-2 inline-flex items-center gap-1 text-[0.78rem] ${MUTED} no-underline hover:underline`}
            >
              {p.document.title}
              {p.document.fetchedAt
                ? `, lu le ${frenchDate(p.document.fetchedAt)}`
                : ''}
              <ArrowUpRight size={12} />
            </a>
          </li>
        ))}
      </ol>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="mt-6 inline-flex h-10 items-center rounded-full bg-[#F4F6F8] px-5 text-[0.9rem] font-bold text-[#0B1A2A] hover:bg-[#E8ECF0]"
        >
          {all
            ? 'Replier'
            : rest === 1
              ? 'Voir l’autre passage'
              : `Voir les ${rest} autres passages`}
        </button>
      )}
    </li>
  )
}
