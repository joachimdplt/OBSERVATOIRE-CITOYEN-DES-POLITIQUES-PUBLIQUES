import { ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CandidateProgramme as Programme } from '../../../types/public'
import { atText } from '../../../utils/highlight'
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


        {p.chapters.length > 0 && (
          <Reader programme={p} election={election} candidate={candidate} />
        )}
      </div>
    </section>
  )
}



type Passage = Programme['passages'][number]

/** D'où vient un document : un fichier (PDF) ou une page de son site. */
const kindOf = (url: string) =>
  /\.pdf(\?|#|$)/i.test(url) ? 'En document' : 'Sur son site internet'
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


  const go = (i: number) => {
    need(i)
    const el = document.getElementById(`chapitre-${i}`)
    if (el) smoothScrollTo(el)
  }

  return (
    <div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-[110px] max-h-[calc(100vh-130px)] overflow-y-auto rounded-[28px] glass p-3">
            <ul className="space-y-1">
              {groups.map((g, i) => (
                <li key={i}>
                  {/* Le programme en document et les pages de son site se
                      distinguent : un intertitre à chaque changement. */}
                  {(i === 0 ||
                    kindOf(p.outline[g.document].url) !==
                      kindOf(p.outline[groups[i - 1].document].url)) && (
                    <p
                      className={`px-3 pt-3 pb-1 text-[0.75rem] font-bold ${MUTED}`}
                    >
                      {kindOf(p.outline[g.document].url)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => go(i)}
                    className="chapter-link"
                    aria-current={active === i ? 'true' : undefined}
                  >
                    <span className="flex-1">{g.label}</span>
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
                {g.label}
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
}: {
  index: number
  group: ReadingChapter
  /** Le document du chapitre : son titre et son adresse. */
  document: Programme['outline'][number]
  /** Absents tant que le chapitre n'est pas chargé. */
  passages: Passage[] | undefined
  onNear: () => void
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


  const sections = passages ? sectionsOf(passages, d.title) : []
  let lastPage: number | null = null
  return (
    <li
      ref={card}
      id={`chapitre-${index}`}
      className="scroll-mt-32 rounded-[28px] glass p-5 md:p-8"
    >
      <a
        href={g.from ? `${d.url}#page=${g.from}` : d.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F4F6F8] px-3 py-1 text-[0.82rem] font-bold text-[#0B1A2A] no-underline hover:underline"
      >
        <span className={`shrink-0 font-semibold ${MUTED}`}>
          {kindOf(d.url) === 'En document' ? 'Document' : 'Son site'} ·
        </span>
        <span className="truncate">{documentName(d.title)}</span>
        {g.from !== null && (
          <span className="shrink-0 font-semibold">
            · {g.from === g.to ? `p. ${g.from}` : `p. ${g.from} à ${g.to}`}
          </span>
        )}
        <ArrowUpRight size={12} className="shrink-0" />
      </a>
      {passages && (
        <div className="mt-4 space-y-5 glass-text text-justify hyphens-auto">
          {sections.map((s, k) => (
            <div key={k} className="scroll-mt-40">
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
                      <QuoteText text={q.text} />
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



