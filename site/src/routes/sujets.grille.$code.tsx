import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { QuoteText } from '../components/molecules/QuoteText'
import { getSubject } from '../services/public-api'
import type { Subject } from '../types/public'
import { smoothScrollTo } from '../utils/scroll'
import { frenchDate } from '../utils/date'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/sujets/grille/$code')({
  loader: async ({ params }) => {
    if (!/^\d{1,2}$/.test(params.code)) throw notFound()
    const subject = await getSubject({ data: { code: params.code } })
    if (!subject) throw notFound()
    return subject
  },
  head: ({ loaderData }) => ({
    meta: seo({
      title: loaderData?.topic.label ?? 'Sujet',
      description: loaderData
        ? `${loaderData.topic.label} : les chapitres des programmes des candidats à la présidentielle 2027, cités mot pour mot.`
        : '',
    }),
  }),
  component: SubjectPage,
})

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

type Candidate = Subject['candidates'][number]

/** « LR_Produire_Plus_LIVRET.pdf » se lit « LR Produire Plus LIVRET ». */
const documentName = (title: string) =>
  /\.pdf$/i.test(title)
    ? title
        .replace(/\.pdf$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim()
    : title

const isPdf = (url: string) => /\.pdf(\?|#|$)/i.test(url)

/**
 * L'ordre tiré au hasard pour cette visite : le même d'un sujet à l'autre et
 * pendant toute la lecture (un rechargement des données ne le change pas).
 * Une nouvelle visite tire un nouvel ordre : aucun candidat toujours en tête.
 */
let visitOrder: string[] | null = null

function useShuffled<T extends { slug: string }>(list: T[]) {
  const [order, setOrder] = useState<string[] | null>(visitOrder)
  useEffect(() => {
    if (!visitOrder) {
      const copy = list.map((c) => c.slug)
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      visitOrder = copy
    }
    setOrder(visitOrder)
  }, [list])
  if (!order) return list
  const rank = (slug: string) => {
    const i = order.indexOf(slug)
    return i === -1 ? order.length : i
  }
  return [...list].sort((a, b) => rank(a.slug) - rank(b.slug))
}

/**
 * Un sujet de la grille, lu comme un programme : à gauche le sommaire des
 * candidats, dans un ordre tiré au hasard ; à droite, pour chacun, ses
 * chapitres rangés dans ce sujet, leur titre exact et leurs premiers
 * passages cités mot pour mot. Le rangement est automatique.
 */
function SubjectPage() {
  const s = Route.useLoaderData()
  const candidates = useShuffled(s.candidates)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setActive(Number(e.target.id.replace('candidat-', '')))
      },
      { rootMargin: '-30% 0px -65% 0px' },
    )
    candidates.forEach((_, i) => {
      const el = document.getElementById(`candidat-${i}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [candidates])

  const go = (i: number) => {
    const el = document.getElementById(`candidat-${i}`)
    if (el) smoothScrollTo(el)
  }

  return (
    <main>
      {/* Le sujet reste en haut de l'écran pendant toute la lecture. */}
      <div className="sticky top-[86px] z-[6] border-b border-[#0B1A2A]/8 bg-[#F4F6F8]/90 px-6 py-3 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-[1280px] items-baseline gap-4">
          <Link
            to="/sujets"
            className={`shrink-0 text-[0.85rem] font-bold no-underline hover:underline ${MUTED}`}
          >
            ← Sujets
          </Link>
          <h1
            className={`${DISPLAY} truncate text-[clamp(1.4rem,3vw,2rem)] leading-tight`}
          >
            {s.topic.label}
          </h1>
        </div>
      </div>

      <section className="px-6 pt-8 pb-20 md:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav className="sticky top-[166px] max-h-[calc(100vh-186px)] overflow-y-auto rounded-[28px] bg-white p-3">
              <ul className="space-y-1">
                {candidates.map((c, i) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => go(i)}
                      className="chapter-link items-center"
                      aria-current={active === i ? 'true' : undefined}
                    >
                      {c.photo && (
                        <img
                          src={c.photo}
                          alt=""
                          className="size-7 shrink-0 rounded-full object-cover object-top"
                        />
                      )}
                      <span className="flex-1">{c.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {s.without.length > 0 && <Without list={s.without} />}
            </nav>
          </aside>

          <div className="min-w-0">
            {candidates.length === 0 && (
              <p className={`rounded-[28px] bg-white p-8 ${MUTED}`}>
                Aucun chapitre rangé dans ce sujet pour l’instant.
              </p>
            )}
            <ol className="space-y-5">
              {candidates.map((c, i) => (
                <CandidateCard key={c.slug} index={i} candidate={c} />
              ))}
            </ol>
            {s.without.length > 0 && (
              <div className="mt-6 rounded-[28px] bg-white p-3 lg:hidden">
                <Without list={s.without} />
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function CandidateCard({
  index,
  candidate: c,
}: {
  index: number
  candidate: Candidate
}) {
  return (
    <li
      id={`candidat-${index}`}
      className="scroll-mt-[170px] rounded-[28px] bg-white p-5 md:p-8"
    >
      {/* Le candidat reste en haut de sa carte tant qu'on la lit. */}
      <Link
        to="/candidats/$slug"
        params={{ slug: c.slug }}
        className="sticky top-[150px] z-[4] -mx-5 -mt-5 flex items-center gap-3 rounded-t-[28px] border-b border-[#0B1A2A]/8 bg-white px-5 py-4 no-underline md:-mx-8 md:-mt-8 md:px-8"
      >
        {c.photo && (
          <img
            src={c.photo}
            alt=""
            loading="lazy"
            className="size-12 rounded-full object-cover object-top"
          />
        )}
        <span>
          <span className={`${DISPLAY} block text-[1.3rem] hover:underline`}>
            {c.name}
          </span>
          <span className={`block text-[0.85rem] font-semibold ${MUTED}`}>
            {c.party ?? 'Sans étiquette'} ·{' '}
            {c.programmeStatus === 'complete'
              ? 'lire tout son programme'
              : 'lire ses documents'}
          </span>
        </span>
      </Link>

      {c.programmeStatus !== 'complete' && c.programmeNote && (
        <p
          className={`mt-4 rounded-[14px] bg-[#F4F6F8] px-4 py-3 text-[0.88rem] leading-relaxed ${MUTED}`}
        >
          <span className="font-bold text-[#0B1A2A]">Documents partiels.</span>{' '}
          {c.programmeNote}
        </p>
      )}
      {c.approach && <Approach approach={c.approach} />}
      <div className="mt-6 space-y-8">
        {c.chapters.map((ch, i) => {
          const page = ch.excerpt[0]?.page ?? null
          return (
            <div key={i}>
              <a
                href={
                  page ? `${ch.document.url}#page=${page}` : ch.document.url
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F4F6F8] px-3 py-1 text-[0.82rem] font-bold text-[#0B1A2A] no-underline hover:underline"
              >
                <span className={`shrink-0 font-semibold ${MUTED}`}>
                  {isPdf(ch.document.url) ? 'Document' : 'Son site'} ·
                </span>
                <span className="truncate">
                  {documentName(ch.document.title)}
                </span>
                {page !== null && (
                  <span className="shrink-0 font-semibold">· p. {page}</span>
                )}
                <ArrowUpRight size={12} className="shrink-0" />
              </a>
              <div className="mt-4 border-l-2 border-[#0B1A2A]/10 pl-5 md:pl-7">
                <p className="mb-2 text-[1rem] font-extrabold text-[#0B1A2A]">
                  {ch.heading}
                </p>
                <div className="space-y-4">
                  {ch.excerpt.map((p, j) => (
                    <QuoteText key={j} text={p.quote} />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </li>
  )
}

/**
 * Les candidats qui n'ont rien dans ce sujet, en deux listes : ceux dont
 * aucun programme n'est collecté, et ceux dont le programme collecté n'a
 * aucun chapitre rangé ici. Chaque nom mène à sa page.
 */
function Without({ list }: { list: Subject['without'] }) {
  const read = list.filter((c) => c.collected)
  const none = list.filter((c) => !c.collected)
  return (
    <div className="space-y-4 pt-3">
      {read.length > 0 && (
        <Names
          title="Rien de rangé dans ce sujet"
          note="Leur programme collecté n’a aucun chapitre rangé ici. Ils peuvent en parler ailleurs, ou dans un document pas encore collecté."
          list={read}
        />
      )}
      {none.length > 0 && (
        <Names
          title="Aucun programme collecté"
          note="Rien n’a encore été publié, ou rien n’a encore été trouvé."
          list={none}
        />
      )}
    </div>
  )
}

function Names({
  title,
  note,
  list,
}: {
  title: string
  note: string
  list: Subject['without']
}) {
  return (
    <div>
      <p className="px-3 pb-1 text-[0.75rem] font-bold text-[#5B6470]">
        {title}
      </p>
      <p className="px-3 pb-2 text-[0.78rem] leading-snug text-[#5B6470]">
        {note}
      </p>
      <ul>
        {list.map((c) => (
          <li key={c.slug}>
            <Link
              to="/candidats/$slug"
              params={{ slug: c.slug }}
              className="block rounded-[14px] px-3 py-1.5 text-[0.82rem] font-semibold text-[#5B6470] no-underline hover:bg-[#F4F6F8] hover:text-[#0B1A2A]"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Une démarche qui n'est pas un programme, sur ce sujet : son constat
 * (ses phrases et ses chiffres sourcés) et sa consultation (les nombres
 * qu'il publie). Les solutions d'une consultation sont celles des
 * participants : elles ne sont ni citées ni attribuées au candidat.
 */
function Approach({
  approach: a,
}: {
  approach: NonNullable<Candidate['approach']>
}) {
  return (
    <div className="mt-6 space-y-6">
      {a.constats.map((k) => (
        <div key={k.url}>
          <a
            href={k.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F4F6F8] px-3 py-1 text-[0.82rem] font-bold text-[#0B1A2A] no-underline hover:underline"
          >
            <span className={`shrink-0 font-semibold ${MUTED}`}>
              Son constat ·
            </span>
            <span className="truncate">{k.label}</span>
            <ArrowUpRight size={12} className="shrink-0" />
          </a>
          <div className="mt-4 border-l-2 border-[#0B1A2A]/10 pl-5 md:pl-7">
            <p className="mb-3 text-[1rem] font-extrabold text-[#0B1A2A]">
              « {k.title} »
            </p>
            <ul className="space-y-2">
              {k.indicators.map((i) => (
                <li
                  key={i.name}
                  className="text-[0.95rem] leading-relaxed text-[#0B1A2A]"
                >
                  <span className="font-bold">{i.name}</span> : {i.sentence}{' '}
                  <span className={`text-[0.8rem] ${MUTED}`}>
                    ({i.unit} ·{' '}
                    {i.sourceUrl ? (
                      <a
                        href={i.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {i.source}
                      </a>
                    ) : (
                      i.source
                    )}
                    )
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
      {a.consultation.map((t) => (
        <div key={t.theme}>
          <a
            href={t.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F4F6F8] px-3 py-1 text-[0.82rem] font-bold text-[#0B1A2A] no-underline hover:underline"
          >
            <span className={`shrink-0 font-semibold ${MUTED}`}>
              Sa consultation ·
            </span>
            <span className="truncate">{t.theme}</span>
            <ArrowUpRight size={12} className="shrink-0" />
          </a>
          <p className="mt-3 border-l-2 border-[#0B1A2A]/10 pl-5 text-[0.95rem] leading-relaxed text-[#0B1A2A] md:pl-7">
            Une consultation ouverte sur ce thème : {t.text}, déposés par des
            participants, selon sa page au{' '}
            {frenchDate(a.fetchedAt.slice(0, 10))}.{' '}
            <span className={MUTED}>
              Ces solutions sont celles des participants, pas les siennes.
            </span>
          </p>
        </div>
      ))}
    </div>
  )
}
