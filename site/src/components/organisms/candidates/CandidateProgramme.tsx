import { Link } from '@tanstack/react-router'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CandidateProgramme as Programme } from '../../../types/public'
import { HEAT_GRADIENT, heatColor, isDark } from '../../../utils/heat'
import { atText, figuresIn } from '../../../utils/highlight'
import { squarify } from '../../../utils/treemap'
import { smoothScrollTo } from '../../../utils/scroll'
import { QuoteText } from '../../molecules/QuoteText'

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

/** « LR_Produire_Plus_LIVRET.pdf » se lit « LR Produire Plus LIVRET ». */
const documentName = (title: string) =>
  /\.pdf$/i.test(title)
    ? title
        .replace(/\.pdf$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim()
    : title

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0

/**
 * La clé d'un titre : « Dépenses inéfficaces » et « Dépenses inefficaces »,
 * écrits dans deux pages du même document, sont un seul titre.
 */
const headingKey = (heading: string) =>
  heading
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim()

/** Un clic sur un titre de la mosaïque ouvre ses passages chiffrés. */
const OPEN_HEADING = 'ouvrir-rubrique'

/** Les titres du candidat, tous documents confondus, avec leurs passages. */
function ownHeadings(outline: Programme['outline']) {
  const byKey = new Map<string, { name: string; key: string; passages: number }>()
  for (const d of outline)
    for (const h of d.headings) {
      const key = headingKey(h.heading)
      const seen = byKey.get(key)
      if (seen) seen.passages += h.passages
      else byKey.set(key, { name: h.heading, key, passages: h.passages })
    }
  const all = [...byKey.values()]
  const total = all.reduce((n, h) => n + h.passages, 0)
  return all
    .map((h) => ({ ...h, share: total > 0 ? h.passages / total : 0 }))
    .sort((a, b) => b.passages - a.passages)
}

/**
 * Le programme d'un candidat, lu en entier, sans une phrase écrite par une
 * machine : des comptes, ses propres titres, ses mots, ses citations.
 */
export function CandidateProgramme({
  programme: p,
  candidate,
}: {
  programme: Programme
  /** Le candidat : un sujet s'ouvre sur ses citations. */
  candidate: string
}) {
  const { summary: s } = p
  if (s.passages === 0) return null
  const maxCount = Math.max(...p.vocabulary.map((v) => v.count), 1)
  const headings = ownHeadings(p.outline)
  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
          Son programme, lu en entier
        </h2>

        {/* Le résumé : rien que des comptes. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact value={s.passages} label="passages lus" />
          <Fact value={s.proposals} label="propositions" />
          <Fact value={s.figured} label="passages chiffrés" />
          <Fact
            value={`${percent(s.covered, s.passages)} %`}
            label="des passages rangés dans un sujet"
          />
        </div>

        {headings.length >= 3 ? (
          <div className="rounded-[28px] bg-white p-4 md:p-6">
            <p className="px-2 font-extrabold text-[#0B1A2A]">
              De quoi parle son programme, sous ses propres titres
            </p>
            <p className={`mt-1 px-2 text-[0.85rem] ${MUTED}`}>
              Chaque case est un titre de ses documents, à la taille de ses
              passages. Un clic ouvre ses citations.
            </p>
            <div className="mt-4">
              <OwnHeadings headings={headings} />
            </div>
          </div>
        ) : (
          s.topTopics.length > 0 && (
            <div className="rounded-[28px] bg-white p-4 md:p-6">
              <p className="px-2 font-extrabold text-[#0B1A2A]">
                De quoi parle son programme
              </p>
              <div className="mt-4">
                <OwnTopics topics={s.topTopics} candidate={candidate} />
              </div>
            </div>
          )
        )}

        {p.vocabulary.length > 0 && (
          <div className="rounded-[28px] bg-white p-6 md:p-8">
            <p className="font-extrabold text-[#0B1A2A]">Son vocabulaire</p>
            <ul className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              {p.vocabulary.map((v) => (
                <li
                  key={v.word}
                  title={`${v.count} emplois`}
                  className="leading-tight font-extrabold tracking-[-0.02em] text-[#0B1A2A]"
                  style={{
                    fontSize: `${0.95 + 1.15 * Math.sqrt(v.count / maxCount)}rem`,
                    opacity: 0.55 + 0.45 * Math.sqrt(v.count / maxCount),
                  }}
                >
                  {v.word}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Outline outline={p.outline} />

        {p.passages.length > 0 && <Reader passages={p.passages} />}
      </div>
    </section>
  )
}

function Fact({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-[24px] bg-white p-5">
      <p className="text-[2.2rem] leading-none font-extrabold text-[#0B1A2A] tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-bold text-[#0B1A2A]">{label}</p>
    </div>
  )
}

/** Sa structure : ses documents, puis ses rubriques, dans ses propres titres. */
function Outline({ outline }: { outline: Programme['outline'] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-[28px] bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 p-6 text-left md:p-8"
      >
        <span>
          <span className="block font-extrabold text-[#0B1A2A]">
            Ses étapes, dans ses propres titres
          </span>
        </span>
        <ChevronDown
          size={22}
          className={`shrink-0 text-[#0B1A2A] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ol className="space-y-6 border-t border-[#0B1A2A]/8 p-6 md:p-8">
          {outline.map((d) => (
            <li key={d.url}>
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-[#0B1A2A] no-underline hover:underline"
              >
                {documentName(d.title)}
                <span className={`font-semibold ${MUTED}`}>
                  · {d.passages} passages
                </span>
                <ArrowUpRight size={14} />
              </a>
              {d.headings.length > 0 && (
                <ul className="mt-2 divide-y divide-[#0B1A2A]/6">
                  {d.headings.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-baseline justify-between gap-4 py-1.5 text-[0.92rem]"
                    >
                      <a
                        href={atText(d.url, h.heading)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0B1A2A] no-underline hover:underline"
                      >
                        {h.heading}
                      </a>
                      <span className={`shrink-0 tabular-nums ${MUTED}`}>
                        {h.passages}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

type Passage = Programme['passages'][number]

/** L'adresse d'un passage : la page du PDF, ou le texte dans la page web. */
const passageHref = (url: string, p: { page: number | null; text: string }) =>
  p.page ? `${url}#page=${p.page}` : atText(url, p.text.slice(0, 80))

/**
 * Le programme regroupé comme il est écrit : par document, ou par ses
 * propres titres quand le candidat ne publie qu'un document ou deux ; sans
 * titre, par page du PDF. Chaque rubrique une seule fois.
 */
function byChapter(passages: Passage[]) {
  const groups: {
    title: string
    /** Le nom du chapitre dans le panneau : son titre, sa page ou son document. */
    label: string
    url: string
    sections: {
      heading: string
      quotes: { text: string; page: number | null }[]
    }[]
    count: number
  }[] = []
  const byHeading = new Set(passages.map((f) => f.document.url)).size < 3
  for (const f of passages) {
    const heading = f.heading === f.document.title ? '' : f.heading
    const label = !byHeading
      ? documentName(f.document.title)
      : heading || (f.page ? `Page ${f.page}` : documentName(f.document.title))
    let g = groups.at(-1)
    if (!g || g.url !== f.document.url || (byHeading && g.label !== label)) {
      g = {
        title: f.document.title,
        label,
        url: f.document.url,
        sections: [],
        count: 0,
      }
      groups.push(g)
    }
    g.count++
    const quote = { text: f.quote, page: f.page }
    const last = g.sections.at(-1)
    if (last && last.heading === heading) last.quotes.push(quote)
    else g.sections.push({ heading, quotes: [quote] })
  }
  return groups
}

/**
 * Tout le programme, dans son ordre, en entier : un panneau fixe des
 * chapitres (celui qu'on lit en surbrillance) et, à côté, une carte par
 * chapitre, chiffres surlignés, chaque passage avec sa page.
 */
function Reader({ passages }: { passages: Passage[] }) {
  const groups = byChapter(passages)
  const figured = passages.filter((p) => p.figured).length
  const [active, setActive] = useState(0)
  const bar = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setActive(Number(e.target.id.replace('chapitre-', '')))
      },
      { rootMargin: '-30% 0px -65% 0px' },
    )
    groups.forEach((_, i) => {
      const el = document.getElementById(`chapitre-${i}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [groups.length])

  useEffect(() => {
    bar.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [active])

  const go = (i: number) => {
    const el = document.getElementById(`chapitre-${i}`)
    if (el) smoothScrollTo(el)
  }

  return (
    <div>
      <div className="rounded-[28px] bg-white p-6 md:p-8">
        <p className="font-extrabold text-[#0B1A2A]">
          Son programme, chapitre par chapitre · {passages.length} passages,
          dont {figured} chiffrés
        </p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-[110px] max-h-[calc(100vh-130px)] overflow-y-auto rounded-[28px] bg-white p-3">
            <ul className="space-y-1">
              {groups.map((g, i) => (
                <li key={`${g.url}-${i}`}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    className={`flex w-full items-baseline gap-3 rounded-[14px] px-3 py-2 text-left text-[0.86rem] leading-snug font-bold transition-colors ${
                      active === i
                        ? 'bg-[#0B1A2A] text-white'
                        : 'text-[#0B1A2A] hover:bg-[#F4F6F8]'
                    }`}
                  >
                    <span className="flex-1">{g.label}</span>
                    <span
                      className={`shrink-0 tabular-nums ${
                        active === i ? 'text-white/70' : MUTED
                      }`}
                    >
                      {g.count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          {/* Sur téléphone, la barre des chapitres reste en haut. */}
          <nav
            ref={bar}
            className="sticky top-[86px] z-[4] -mx-6 flex gap-2 overflow-x-auto bg-[#F4F6F8]/90 px-6 py-2 backdrop-blur lg:hidden"
          >
            {groups.map((g, i) => (
              <button
                key={`${g.url}-${i}`}
                type="button"
                data-index={i}
                onClick={() => go(i)}
                className={`max-w-[240px] shrink-0 truncate rounded-full px-3.5 py-1.5 text-[0.82rem] font-bold transition-colors ${
                  active === i
                    ? 'bg-[#0B1A2A] text-white'
                    : 'bg-white text-[#0B1A2A]'
                }`}
              >
                {g.label} · {g.count}
              </button>
            ))}
          </nav>

          <ol className="mt-4 space-y-5 lg:mt-0">
            {groups.map((g, i) => (
              <Chapter key={`${g.url}-${i}`} index={i} group={g} />
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

function Chapter({
  index,
  group: g,
}: {
  index: number
  group: ReturnType<typeof byChapter>[number]
}) {
  const card = useRef<HTMLLIElement>(null)
  // Un titre cliqué dans la mosaïque : la page défile jusqu'à lui.
  useEffect(() => {
    const open = (e: Event) => {
      const key = (e as CustomEvent<string>).detail
      const el = card.current?.querySelector(`[data-heading="${key}"]`)
      if (el instanceof HTMLElement) smoothScrollTo(el)
    }
    window.addEventListener(OPEN_HEADING, open)
    return () => window.removeEventListener(OPEN_HEADING, open)
  }, [g])
  const pages = g.sections.flatMap((s) => s.quotes.map((q) => q.page ?? 0))
  const from = Math.min(...pages.filter(Boolean))
  const to = Math.max(...pages)
  return (
    <li
      ref={card}
      id={`chapitre-${index}`}
      className="scroll-mt-32 rounded-[28px] bg-white p-5 md:p-8"
    >
      <a
        href={from ? `${g.url}#page=${from}` : g.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F4F6F8] px-3 py-1 text-[0.82rem] font-bold text-[#0B1A2A] no-underline hover:underline"
      >
        <span className="truncate">{documentName(g.title)}</span>
        {from > 0 && (
          <span className="shrink-0 font-semibold">
            · {from === to ? `p. ${from}` : `p. ${from} à ${to}`}
          </span>
        )}
        <span className={`shrink-0 font-semibold ${MUTED}`}>
          · {g.count} passage{g.count > 1 ? 's' : ''}
        </span>
        <ArrowUpRight size={12} className="shrink-0" />
      </a>
      <div className="mt-4 space-y-5 border-l-2 border-[#0B1A2A]/10 pl-5 md:pl-7">
        {g.sections.map((s, k) => (
          <div
            key={k}
            data-heading={headingKey(s.heading)}
            className="scroll-mt-40"
          >
            {s.heading && (
              <a
                href={passageHref(g.url, {
                  page: s.quotes[0].page,
                  text: s.heading,
                })}
                target="_blank"
                rel="noreferrer"
                className={`mb-2 block text-[1rem] font-extrabold text-[#0B1A2A] no-underline hover:underline`}
              >
                {s.heading}
              </a>
            )}
            <div className="space-y-4">
              {s.quotes.map((q, j) => (
                <div key={j}>
                  <QuoteText text={q.text} terms={figuresIn(q.text)} />
                  {q.page && (
                    <a
                      href={`${g.url}#page=${q.page}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-1 inline-block text-[0.78rem] font-semibold ${MUTED} no-underline hover:text-[#0B1A2A] hover:underline`}
                    >
                      p. {q.page}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </li>
  )
}

/**
 * La mosaïque des sujets d'un candidat : la surface de chaque sujet est sa
 * part dans le programme (les parts font 100 %), du blanc au noir. Un clic
 * ouvre le sujet sur les citations du candidat.
 */
function OwnTopics({
  topics,
  candidate,
}: {
  topics: Programme['summary']['topTopics']
  candidate: string
}) {
  // Une case assez grande pour son titre : les plus petites parts sont
  // regroupées au-delà de vingt sujets, sans changer les autres.
  const shown = topics.slice(0, 20)
  const ranked = [...shown].sort((a, b) => b.share - a.share)
  const heatOf = (slug: string) => {
    const i = ranked.findIndex((t) => t.slug === slug)
    return ranked.length > 1 ? 1 - i / (ranked.length - 1) : 1
  }
  const floor = 0.018
  const cells = squarify(
    shown.map((t) => ({ value: Math.max(t.share, floor), item: t })),
    1.9,
  )
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 px-2 text-[0.8rem] font-semibold text-[#5B6470]">
        <span>Le moins</span>
        <span
          className="h-2 w-32 rounded-full"
          style={{ background: HEAT_GRADIENT }}
          aria-hidden
        />
        <span>le plus</span>
      </div>
      <div className="relative aspect-[1.9] w-full">
        {cells.map(({ x, y, w, h, item: t }) => {
          const heat = heatOf(t.slug)
          const dark = isDark(heat)
          return (
            <Link
              key={t.slug}
              to="/sujets/$slug"
              params={{ slug: t.slug }}
              hash={`candidat-${candidate}`}
              hashScrollIntoView={false}
              title={`${t.name} : ${Math.round(t.share * 100)} % de son programme (${t.passages} passages)`}
              className="group absolute p-[3px] no-underline"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                width: `${w * 100}%`,
                height: `${h * 100}%`,
              }}
            >
              <span
                className="flex size-full flex-col justify-between overflow-hidden rounded-[14px] p-2.5"
                style={{
                  backgroundColor: heatColor(heat),
                  boxShadow:
                    heat < 0.15
                      ? 'inset 0 0 0 1px rgba(11,26,42,0.08)'
                      : undefined,
                }}
              >
                <span
                  className={`text-[0.82rem] leading-tight font-extrabold group-hover:underline ${
                    dark ? 'text-white' : 'text-[#0B1A2A]'
                  }`}
                >
                  {t.name}
                </span>
                <span
                  className={`text-[1.1rem] font-extrabold tabular-nums ${
                    dark ? 'text-white/80' : 'text-[#0B1A2A]/70'
                  }`}
                >
                  {Math.round(t.share * 100)} %
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/**
 * La mosaïque des titres du candidat : chaque case est un titre de ses
 * documents, mot pour mot, à la taille de ses passages, du blanc au noir.
 * Un clic ouvre ses passages chiffrés plus bas dans la page.
 */
function OwnHeadings({
  headings,
}: {
  headings: ReturnType<typeof ownHeadings>
}) {
  const shown = headings.slice(0, 30)
  const heatOf = (i: number) =>
    shown.length > 1 ? 1 - i / (shown.length - 1) : 1
  const floor = 0.02
  const cells = squarify(
    shown.map((h, i) => ({
      value: Math.max(h.share, floor),
      item: { ...h, heat: heatOf(i) },
    })),
    1.9,
  )
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 px-2 text-[0.8rem] font-semibold text-[#5B6470]">
        <span>Le moins</span>
        <span
          className="h-2 w-32 rounded-full"
          style={{ background: HEAT_GRADIENT }}
          aria-hidden
        />
        <span>le plus</span>
      </div>
      <div className="relative aspect-[1.2] w-full md:aspect-[1.9]">
        {cells.map(({ x, y, w, h, item: t }) => {
          const dark = isDark(t.heat)
          return (
            <button
              key={t.key}
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent(OPEN_HEADING, { detail: t.key }),
                )
              }
              title={`${t.name} : ${t.passages} passage${t.passages > 1 ? 's' : ''}`}
              className="group absolute p-[3px] text-left"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                width: `${w * 100}%`,
                height: `${h * 100}%`,
              }}
            >
              <span
                className="flex size-full flex-col justify-between overflow-hidden rounded-[14px] p-2.5"
                style={{
                  backgroundColor: heatColor(t.heat),
                  boxShadow:
                    t.heat < 0.15
                      ? 'inset 0 0 0 1px rgba(11,26,42,0.08)'
                      : undefined,
                }}
              >
                <span
                  className={`text-[0.82rem] leading-tight font-extrabold group-hover:underline ${
                    dark ? 'text-white' : 'text-[#0B1A2A]'
                  }`}
                >
                  {t.name}
                </span>
                <span
                  className={`text-[1.1rem] font-extrabold tabular-nums ${
                    dark ? 'text-white/80' : 'text-[#0B1A2A]/70'
                  }`}
                >
                  {t.passages}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
