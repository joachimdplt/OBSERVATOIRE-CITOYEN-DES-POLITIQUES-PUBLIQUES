import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { QuoteText } from '../components/molecules/QuoteText'
import { getSubject } from '../services/public-api'
import type { Subject } from '../types/public'
import { smoothScrollTo } from '../utils/scroll'
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
    ? title.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
    : title

const isPdf = (url: string) => /\.pdf(\?|#|$)/i.test(url)

/** Un ordre tiré au hasard, après le chargement : aucun candidat toujours en tête. */
function useShuffled<T>(list: T[]) {
  const [order, setOrder] = useState(list)
  useEffect(() => {
    const copy = [...list]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    setOrder(copy)
  }, [list])
  return order
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
      <section className="px-6 pt-16 pb-12 md:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Link
            to="/sujets"
            className={`text-[0.9rem] font-bold no-underline hover:underline ${MUTED}`}
          >
            ← Tous les sujets
          </Link>
          <h1 className={`${DISPLAY} mt-3 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08]`}>
            {s.topic.label}
          </h1>
          <p className={`mt-6 text-justify text-[0.95rem] leading-[1.75] hyphens-auto ${MUTED}`}>
            Les chapitres des programmes rangés dans ce sujet de la grille du{' '}
            {s.classification.grid}. Le rangement est fait automatiquement,
            chapitre par chapitre
            {s.classification.model ? ` (modèle ${s.classification.model})` : ''}
            {' '}: il peut se tromper, et un rangement faux est retiré. Les
            candidats sont dans un ordre tiré au hasard.
          </p>
        </div>
      </section>

      <section className="px-6 py-6 pb-20 md:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav className="sticky top-[110px] max-h-[calc(100vh-130px)] overflow-y-auto rounded-[28px] bg-white p-3">
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

function CandidateCard({ index, candidate: c }: { index: number; candidate: Candidate }) {
  return (
    <li
      id={`candidat-${index}`}
      className="scroll-mt-32 rounded-[28px] bg-white p-5 md:p-8"
    >
      <Link
        to="/candidats/$slug"
        params={{ slug: c.slug }}
        className="flex items-center gap-3 no-underline"
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
            {c.party ?? 'Sans étiquette'} · lire tout son programme
          </span>
        </span>
      </Link>

      <div className="mt-6 space-y-8">
        {c.chapters.map((ch, i) => {
          const page = ch.excerpt[0]?.page ?? null
          return (
            <div key={i}>
              <a
                href={page ? `${ch.document.url}#page=${page}` : ch.document.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F4F6F8] px-3 py-1 text-[0.82rem] font-bold text-[#0B1A2A] no-underline hover:underline"
              >
                <span className={`shrink-0 font-semibold ${MUTED}`}>
                  {isPdf(ch.document.url) ? 'Document' : 'Son site'} ·
                </span>
                <span className="truncate">{documentName(ch.document.title)}</span>
                {page !== null && <span className="shrink-0 font-semibold">· p. {page}</span>}
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
 * Les candidats dont aucun chapitre n'est rangé dans ce sujet : leurs noms,
 * chacun vers son programme, et ce que cela veut dire, sans plus.
 */
function Without({ list }: { list: Subject['without'] }) {
  return (
    <div className="pt-3">
      <p className="px-3 pb-1 text-[0.75rem] font-bold text-[#5B6470]">
        Pas de chapitre sur ce sujet
      </p>
      <p className="px-3 pb-2 text-[0.78rem] leading-snug text-[#5B6470]">
        Dans leur programme, aucun chapitre n’est consacré à ce sujet pour
        l’instant. Cela ne veut pas dire qu’ils n’en parlent jamais, ni
        qu’ils n’ont pas d’avis.
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
