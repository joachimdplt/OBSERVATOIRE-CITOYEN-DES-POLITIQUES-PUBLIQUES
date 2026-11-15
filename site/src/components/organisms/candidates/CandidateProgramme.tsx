import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CandidateProgramme as Programme } from '../../../types/public'
import { HEAT_GRADIENT, heatColor, isDark } from '../../../utils/heat'
import { atText, figuresIn } from '../../../utils/highlight'
import { squarify } from '../../../utils/treemap'
import { smoothScrollTo } from '../../../utils/scroll'
import { getProgrammePassages } from '../../../services/public-api'
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
  election,
  candidate,
}: {
  programme: Programme
  /** L'élection, pour charger chaque chapitre à l'approche. */
  election: string
  /** Le candidat : un sujet s'ouvre sur ses citations. */
  candidate: string
}) {
  const { summary: s } = p
  if (s.passages === 0) return null
  const headings = ownHeadings(p.outline)
  // Un candidat qui procède par état des lieux et consultation : ses
  // comptes sont ceux de sa démarche, plus haut ; ici, ses textes seuls.
  const approach = p.approach.length > 0
  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
          {approach
            ? 'Ses textes et ses prises de position'
            : 'Son programme, lu en entier'}
        </h2>

        {/* Le résumé : rien que des comptes. */}
        {!approach && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact value={s.passages} label="passages lus" />
          <Fact value={s.proposals} label="propositions" />
          <Fact value={s.figured} label="passages chiffrés" />
          <Fact
            value={`${percent(s.covered, s.passages)} %`}
            label="des passages rangés dans un sujet"
          />
        </div>
        )}

        {approach ? null : headings.length >= 3 ? (
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

        {p.chapters.length > 0 && (
          <Reader programme={p} election={election} candidate={candidate} />
        )}
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


type Passage = Programme['passages'][number]
type ReadingChapter = Programme['chapters'][number]

/** L'adresse d'un passage : la page du PDF, ou le texte dans la page web. */
const passageHref = (url: string, p: { page: number | null; text: string }) =>
  p.page ? `${url}#page=${p.page}` : atText(url, p.text.slice(0, 80))

/** Les rubriques d'un chapitre chargé, chacune une fois, dans l'ordre. */
function sectionsOf(passages: Passage[], documentTitle: string) {
  const sections: {
    heading: string
    quotes: { text: string; page: number | null }[]
  }[] = []
  for (const f of passages) {
    const heading = f.heading === documentTitle ? '' : f.heading
    const quote = { text: f.quote, page: f.page }
    const last = sections.at(-1)
    if (last && last.heading === heading) last.quotes.push(quote)
    else sections.push({ heading, quotes: [quote] })
  }
  return sections
}

/**
 * Tout le programme, dans son ordre, en entier, chargé comme un monde
 * ouvert : le plan complet tout de suite, le premier chapitre déjà là, et
 * chaque chapitre suivant chargé quand le lecteur s'en approche (ou quand il
 * y saute depuis le panneau ou la mosaïque). Chaque chapitre garde sa place
 * à sa taille prévue, la page ne saute pas.
 */
function Reader({
  programme: p,
  election,
  candidate,
}: {
  programme: Programme
  election: string
  candidate: string
}) {
  const groups = p.chapters
  // Le premier chapitre arrive avec la page ; les autres à l'approche.
  const [loaded, setLoaded] = useState<Partial<Record<number, Passage[]>>>(
    () => ({ 0: p.passages }),
  )
  // Le premier chapitre n'arrive qu'en partie avec la page : sa suite se
  // demande à l'approche comme les autres.
  const asked = useRef(new Set<number>())
  const [active, setActive] = useState(0)
  // Un titre demandé (mosaïque) dans un chapitre pas encore chargé.
  const [target, setTarget] = useState<string | null>(null)
  const bar = useRef<HTMLElement>(null)
  // Un écran étroit (téléphone) : la barre des chapitres en haut.
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)')
    const update = () => setNarrow(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const need = (i: number) => {
    const g = groups.at(i)
    if (!g || asked.current.has(i)) return
    asked.current.add(i)
    // Une réponse vide ou une erreur laisse le chapitre redemandable.
    getProgrammePassages({
      data: { election, slug: candidate, start: g.start, count: g.count },
    })
      .then((r) => {
        if (r) setLoaded((l) => ({ ...l, [i]: r.passages }))
        else asked.current.delete(i)
      })
      .catch(() => asked.current.delete(i))
  }

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

  // Un titre cliqué dans la mosaïque : son chapitre se charge, puis la page
  // y défile.
  useEffect(() => {
    const open = (e: Event) => {
      const key = (e as CustomEvent<string>).detail
      const i = groups.findIndex(
        (g) =>
          headingKey(g.label) === key ||
          g.headings.some((h) => headingKey(h) === key),
      )
      if (i < 0) return
      need(i)
      setTarget(key)
      go(i)
    }
    window.addEventListener(OPEN_HEADING, open)
    return () => window.removeEventListener(OPEN_HEADING, open)
  }, [groups])

  const go = (i: number) => {
    need(i)
    const el = document.getElementById(`chapitre-${i}`)
    if (el) smoothScrollTo(el)
  }

  return (
    <div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-[110px] max-h-[calc(100vh-130px)] overflow-y-auto rounded-[28px] bg-white p-3">
            <ul className="space-y-1">
              {groups.map((g, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    className="chapter-link"
                    aria-current={active === i ? 'true' : undefined}
                  >
                    <span className="flex-1">{g.label}</span>
                    <span className="chapter-link-count">{g.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          {/* Sur téléphone, la barre des chapitres reste en haut ; elle
              n'est construite que sur un écran étroit. */}
          {narrow && (
          <nav
            ref={bar}
            className="sticky top-[86px] z-[4] -mx-6 flex gap-2 overflow-x-auto bg-[#F4F6F8]/90 px-6 py-2 backdrop-blur lg:hidden"
          >
            {groups.map((g, i) => (
              <button
                key={i}
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
          )}

          <ol className="mt-4 space-y-5 lg:mt-0">
            {groups.map((g, i) => (
              <Chapter
                key={i}
                index={i}
                group={g}
                document={p.outline[g.document]}
                passages={loaded[i]}
                onNear={() => need(i)}
                target={target}
              />
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
  document: d,
  passages,
  onNear,
  target,
}: {
  index: number
  group: ReadingChapter
  /** Le document du chapitre : son titre et son adresse. */
  document: Programme['outline'][number]
  /** Absents tant que le chapitre n'est pas chargé. */
  passages: Passage[] | undefined
  onNear: () => void
  target: string | null
}) {
  const card = useRef<HTMLLIElement>(null)

  // Le chapitre (ou sa suite) se charge un peu avant d'arriver à l'écran.
  const complete = !!passages && passages.length >= g.count
  const rest = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (complete || !rest.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onNear()
      },
      { rootMargin: '1500px 0px' },
    )
    observer.observe(rest.current)
    return () => observer.disconnect()
  }, [complete])

  // Chargé à la demande d'un titre de la mosaïque : la page y défile.
  useEffect(() => {
    if (!passages || !target) return
    const el = card.current?.querySelector(`[data-heading="${target}"]`)
    if (el instanceof HTMLElement) smoothScrollTo(el)
  }, [passages, target])

  const sections = passages ? sectionsOf(passages, d.title) : []
  let lastPage: number | null = null
  return (
    <li
      ref={card}
      id={`chapitre-${index}`}
      className="scroll-mt-32 rounded-[28px] bg-white p-5 md:p-8"
    >
      <a
        href={g.from ? `${d.url}#page=${g.from}` : d.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F4F6F8] px-3 py-1 text-[0.82rem] font-bold text-[#0B1A2A] no-underline hover:underline"
      >
        <span className="truncate">{documentName(d.title)}</span>
        {g.from !== null && (
          <span className="shrink-0 font-semibold">
            · {g.from === g.to ? `p. ${g.from}` : `p. ${g.from} à ${g.to}`}
          </span>
        )}
        <span className={`shrink-0 font-semibold ${MUTED}`}>
          · {g.count} passage{g.count > 1 ? 's' : ''}
        </span>
        <ArrowUpRight size={12} className="shrink-0" />
      </a>
      {passages && (
        <div className="mt-4 space-y-5 border-l-2 border-[#0B1A2A]/10 pl-5 md:pl-7">
          {sections.map((s, k) => (
            <div
              key={k}
              data-heading={headingKey(s.heading)}
              className="scroll-mt-40"
            >
              {s.heading && (
                <a
                  href={passageHref(d.url, {
                    page: s.quotes[0].page,
                    text: s.heading,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2 block text-[1rem] font-extrabold text-[#0B1A2A] no-underline hover:underline"
                >
                  {s.heading}
                </a>
              )}
              <div className="space-y-4">
                {s.quotes.map((q, j) => {
                  // Un repère au changement de page seulement ; un chapitre
                  // d'une seule page a déjà la sienne dans sa pastille.
                  const mark =
                    q.page !== null && g.from !== g.to && q.page !== lastPage
                  lastPage = q.page
                  return (
                    <div key={j}>
                      {mark && (
                        <a
                          href={`${d.url}#page=${q.page}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`mb-2 inline-block rounded-full bg-[#F4F6F8] px-2.5 py-0.5 text-[0.75rem] font-bold ${MUTED} no-underline hover:text-[#0B1A2A] hover:underline`}
                        >
                          Page {q.page}
                        </a>
                      )}
                      <QuoteText text={q.text} terms={figuresIn(q.text)} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {!complete && (
        // Sa place, à sa taille prévue, en attendant son texte.
        <div
          ref={rest}
          aria-busy="true"
          className="mt-4 rounded-[18px] bg-[#F4F6F8]"
          style={{
            height: Math.min(4000, 60 + (g.count - (passages?.length ?? 0)) * 110),
          }}
        />
      )}
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
