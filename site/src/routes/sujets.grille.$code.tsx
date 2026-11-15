import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { QuoteText } from '../components/molecules/QuoteText'
import { getSubject } from '../services/public-api'
import type { Subject } from '../types/public'
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
        ? `${loaderData.topic.label} : ce que disent les programmes des candidats à la présidentielle 2027, cité mot pour mot.`
        : '',
    }),
  }),
  component: SubjectPage,
})

const MUTED = 'text-[#5B6470]'

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
 * Un sujet de la grille : pour chaque candidat, dans un ordre tiré au
 * hasard, ses chapitres rangés dans ce sujet, leur titre exact et leurs
 * premiers passages cités mot pour mot. Le rangement est automatique.
 */
function SubjectPage() {
  const s = Route.useLoaderData()
  const candidates = useShuffled(s.candidates)
  return (
    <main className="px-6 pt-16 pb-20 md:px-10">
      <div className="mx-auto max-w-[960px]">
        <Link to="/sujets" className={`text-[0.9rem] font-bold no-underline hover:underline ${MUTED}`}>
          ← Tous les sujets
        </Link>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          {s.topic.label}
        </h1>
        <p className={`mt-4 max-w-[68ch] text-[0.95rem] leading-relaxed ${MUTED}`}>
          Les chapitres des programmes rangés dans ce sujet de la grille du{' '}
          {s.classification.grid}. Le rangement est automatique
          {s.classification.model ? ` (modèle ${s.classification.model})` : ''}
          , chapitre par chapitre : il peut se tromper, et un rangement faux
          est retiré. Candidats dans un ordre tiré au hasard.
        </p>

        {candidates.length === 0 && (
          <p className={`mt-10 ${MUTED}`}>
            Aucun chapitre rangé dans ce sujet pour l’instant.
          </p>
        )}

        <ol className="mt-10 space-y-6">
          {candidates.map((c) => (
            <Candidate key={c.slug} candidate={c} />
          ))}
        </ol>

        {s.without.length > 0 && (
          <p className={`mt-10 text-[0.9rem] leading-relaxed ${MUTED}`}>
            Aucun chapitre rangé dans ce sujet, dans ce qui a été collecté :{' '}
            {s.without.map((c) => c.name).join(', ')}. Cela ne dit rien de leur
            position.
          </p>
        )}
      </div>
    </main>
  )
}

function Candidate({ candidate: c }: { candidate: Subject['candidates'][number] }) {
  return (
    <li className="rounded-[28px] bg-white p-5 md:p-8">
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
            className="size-12 rounded-full object-cover object-top grayscale"
          />
        )}
        <span>
          <span className="block text-[1.15rem] font-extrabold text-[#0B1A2A] hover:underline">
            {c.name}
          </span>
          <span className={`block text-[0.85rem] ${MUTED}`}>
            {c.party ?? 'Sans étiquette'}
          </span>
        </span>
      </Link>
      <div className="mt-5 space-y-6 border-l-2 border-[#0B1A2A]/10 pl-5 md:pl-7">
        {c.chapters.map((ch, i) => (
          <div key={i}>
            <p className="font-extrabold text-[#0B1A2A]">{ch.heading}</p>
            <div className="mt-2 space-y-3">
              {ch.excerpt.map((p, j) => (
                <QuoteText key={j} text={p.quote} />
              ))}
            </div>
            <a
              href={
                ch.excerpt[0]?.page
                  ? `${ch.document.url}#page=${ch.excerpt[0].page}`
                  : ch.document.url
              }
              target="_blank"
              rel="noreferrer"
              className={`mt-2 inline-flex items-center gap-1 text-[0.82rem] font-semibold no-underline hover:underline ${MUTED}`}
            >
              {ch.document.title}
              <ArrowUpRight size={12} />
            </a>
          </div>
        ))}
      </div>
    </li>
  )
}
