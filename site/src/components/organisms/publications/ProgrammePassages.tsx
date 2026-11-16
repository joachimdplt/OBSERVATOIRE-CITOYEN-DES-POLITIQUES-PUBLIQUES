import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { TopicSheet } from '../../../types/public'
import { frenchDate } from '../../../utils/date'
import { atText, meaningfulHeading } from '../../../utils/highlight'
import {
  goTo,
  scrollToHashedCandidate,
  smoothScrollTo,
} from '../../../utils/scroll'
import { QuoteText } from '../../molecules/QuoteText'
import { CandidateMosaic } from '../topics/CandidateMosaic'

type Candidate = TopicSheet['candidates'][number]

const MUTED = 'text-[#5B6470]'
/** Les premiers passages d'un candidat ; les autres se déplient. */
const SHOWN = 3

const STATUS = {
  complete: 'Avec un programme',
  partial: 'Avec un programme',
  none: 'Sans programme collecté',
} as const

const surname = (name: string) => name.split(' ').slice(1).join(' ') || name

type Passage = Candidate['passages'][number]

/**
 * Les passages d'un candidat, regroupés dans l'ordre du texte : par document
 * (le chapitre), puis par rubrique. Chaque titre ne s'écrit qu'une fois.
 */
function groupByChapter(passages: Passage[]) {
  const groups: {
    document: Passage['document']
    first: number
    sections: { heading: string; quotes: string[] }[]
  }[] = []
  passages.forEach((p, i) => {
    let g = groups.at(-1)
    if (!g || g.document.url !== p.document.url) {
      g = { document: p.document, first: i, sections: [] }
      groups.push(g)
    }
    const section = g.sections.at(-1)
    if (section && section.heading === p.heading) section.quotes.push(p.quote)
    else g.sections.push({ heading: p.heading, quotes: [p.quote] })
  })
  return groups
}

/** « LR_Produire_Plus_LIVRET.pdf » se lit « LR Produire Plus LIVRET ». */
const documentName = (title: string) =>
  /\.pdf$/i.test(title)
    ? title
        .replace(/\.pdf$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim()
    : title

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
 * Un sujet dans les programmes publiés. À gauche, un panneau fixe : la
 * mosaïque des candidats et leur liste, celui qu'on lit en surbrillance ; à
 * droite, une carte par candidat, celui qui en parle le plus d'abord, avec ses
 * passages mot pour mot, rangés par chapitre puis par rubrique, le terme
 * trouvé surligné. Les programmes sans passage sont nommés à la fin : l'absence d'un
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

  // Le candidat qu'on lit : celui dont la carte passe au tiers haut de l'écran.
  const [active, setActive] = useState<string | null>(speaking[0]?.slug ?? null)
  const bar = useRef<HTMLElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(e.target.id.replace('candidat-', ''))
      },
      { rootMargin: '-30% 0px -65% 0px' },
    )
    for (const c of speaking) {
      const el = document.getElementById(`candidat-${c.slug}`)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [speaking])
  // Arrivé par la photo d'un candidat dans la mosaïque des sujets.
  useEffect(() => {
    scrollToHashedCandidate()
  }, [])
  // Sur téléphone, l'étiquette du candidat lu reste visible dans la barre.
  useEffect(() => {
    bar.current
      ?.querySelector(`[data-slug="${active}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [active])

  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1280px]">
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Le panneau fixe : la mosaïque et les candidats, celui qu'on lit
              en surbrillance, pendant que les textes défilent à côté. */}
          <aside className="hidden lg:block">
            <div className="sticky top-[110px] rounded-[28px] glass p-4">
              <CandidateMosaic candidates={speaking} active={active} />
              <ul className="mt-4 space-y-1">
                {speaking.map((c) => (
                  <li key={c.slug}>
                    <a
                      href={`#candidat-${c.slug}`}
                      onClick={(e) => goTo(e, c.slug)}
                      className={`flex items-center gap-3 rounded-full py-1 pr-4 pl-1 text-[0.9rem] font-bold no-underline transition-colors ${
                        active === c.slug
                          ? 'bg-[#0B1A2A] text-white'
                          : 'text-[#0B1A2A] hover:bg-[#F4F6F8]'
                      }`}
                    >
                      <Avatar c={c} size={30} />
                      <span className="flex-1 truncate">{surname(c.name)}</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          active === c.slug ? 'text-white/70' : MUTED
                        }`}
                      >
                        {c.passages.length}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="min-w-0">
            {/* Sur téléphone, la barre d'étiquettes reste en haut. */}
            <nav
              ref={bar}
              className="sticky top-[86px] z-[4] -mx-6 flex gap-2 overflow-x-auto bg-[#F4F6F8]/90 px-6 py-2 backdrop-blur lg:hidden"
            >
              {speaking.map((c) => (
                <a
                  key={c.slug}
                  data-slug={c.slug}
                  href={`#candidat-${c.slug}`}
                  onClick={(e) => goTo(e, c.slug)}
                  className={`flex shrink-0 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-[0.88rem] font-bold no-underline transition-colors ${
                    active === c.slug
                      ? 'bg-[#0B1A2A] text-white'
                      : 'bg-white text-[#0B1A2A]'
                  }`}
                >
                  <Avatar c={c} size={28} />
                  {surname(c.name)}
                  <span
                    className={`font-semibold tabular-nums ${
                      active === c.slug ? 'text-white/70' : MUTED
                    }`}
                  >
                    {c.passages.length}
                  </span>
                </a>
              ))}
            </nav>

            <ul className="mt-4 space-y-5 lg:mt-0">
              {speaking.map((c) => (
                <CandidateCard key={c.slug} c={c} terms={topic.terms} />
              ))}
            </ul>

            {silent.length > 0 && (
              <div className="mt-5 rounded-[28px] glass p-6 md:p-8">
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
                        <span
                          className={`text-[0.8rem] font-semibold ${MUTED}`}
                        >
                          {STATUS[c.programmeStatus].toLowerCase()}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function CandidateCard({ c, terms }: { c: Candidate; terms: string[] }) {
  const [all, setAll] = useState(false)
  const card = useRef<HTMLLIElement>(null)
  const shown = all ? c.passages : c.passages.slice(0, SHOWN)
  const rest = c.passages.length - SHOWN
  return (
    <li
      ref={card}
      id={`candidat-${c.slug}`}
      className="scroll-mt-32 rounded-[28px] glass p-5 md:p-8"
    >
      {/* L'en-tête du candidat reste en haut de l'écran tant qu'on lit sa
          carte, sous la barre des étiquettes (téléphone) ou l'en-tête du site. */}
      <div className="sticky top-[138px] z-[3] -mx-5 -mt-5 rounded-t-[28px] bg-white/95 px-5 pt-5 pb-3 backdrop-blur md:-mx-8 md:-mt-8 md:px-8 md:pt-8 lg:top-[96px]">
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
            <p className={`mt-0.5 truncate text-[0.88rem] ${MUTED}`}>
              {c.party}
            </p>
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
      </div>

      <div className="mt-6 space-y-7">
        {groupByChapter(shown).map((g) => (
          <section key={`${g.document.url}-${g.first}`}>
            <a
              href={g.document.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F4F6F8] px-3 py-1 text-[0.8rem] font-bold text-[#0B1A2A] no-underline hover:underline"
            >
              <span className="truncate">{documentName(g.document.title)}</span>
              {g.document.fetchedAt && (
                <span className={`shrink-0 font-semibold ${MUTED}`}>
                  · lu le {frenchDate(g.document.fetchedAt)}
                </span>
              )}
              <ArrowUpRight size={12} className="shrink-0" />
            </a>
            <div className="mt-3 space-y-5 glass-text text-justify hyphens-auto">
              {g.sections.map((section, k) => (
                <div key={k}>
                  {meaningfulHeading(section.heading) &&
                    section.heading !== g.document.title && (
                      <a
                        href={atText(g.document.url, section.heading)}
                        target="_blank"
                        rel="noreferrer"
                        className={`mb-2 block text-[0.85rem] font-bold ${MUTED} no-underline hover:text-[#0B1A2A] hover:underline`}
                      >
                        {section.heading}
                      </a>
                    )}
                  <div className="space-y-4">
                    {section.quotes.map((q, j) => (
                      <QuoteText key={j} text={q} terms={terms} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => {
            // En repliant, on revient au début de la carte.
            if (all && card.current) smoothScrollTo(card.current)
            setAll(!all)
          }}
          className="mt-6 inline-flex h-10 items-center rounded-full bg-[#F4F6F8] px-5 text-[0.9rem] font-bold text-[#0B1A2A] hover:bg-[#E8ECF0]"
        >
          {all ? 'Replier' : 'Voir tout'}
        </button>
      )}
    </li>
  )
}
