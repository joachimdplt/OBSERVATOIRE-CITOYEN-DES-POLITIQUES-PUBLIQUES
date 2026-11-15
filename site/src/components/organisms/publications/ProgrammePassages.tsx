import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import type { TopicSheet } from '../../../types/public'
import { frenchDate } from '../../../utils/date'

const MUTED = 'text-[#5B6470]'
/** Au-delà, les passages d'un candidat se déplient. */
const SHOWN = 3

const STATUS = {
  complete: 'programme complet',
  partial: 'documents partiels',
  none: 'rien de publié',
} as const

/**
 * Un enjeu dans les programmes publiés : chaque candidat qui a publié un
 * programme, par ordre alphabétique, avec les passages qui portent un terme
 * de l'enjeu, cités mot pour mot sous leur rubrique, et le lien vers le
 * document. Un candidat sans passage trouvé est nommé aussi.
 */
export function ProgrammePassages({ topic }: { topic: TopicSheet }) {
  return (
    <section className="px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          Dans les programmes des candidats
        </h2>
        <p className={`mt-4 max-w-[68ch] leading-relaxed ${MUTED}`}>
          Les passages qui contiennent l’un de ces termes :{' '}
          <span className="font-semibold text-[#0B1A2A]">
            {topic.terms.join(', ')}
          </span>
          . Collectés automatiquement sur les sites des candidats, non relus ;
          un programme peut traiter l’enjeu avec d’autres mots.
        </p>
        <ul className="mt-10 space-y-10">
          {topic.candidates.map((c) => (
            <li key={c.slug}>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link
                  to="/candidats/$slug"
                  params={{ slug: c.slug }}
                  className="text-[1.25rem] font-extrabold text-[#0B1A2A] no-underline hover:underline"
                >
                  {c.name}
                </Link>
                <span className={`text-sm ${MUTED}`}>
                  {c.party} · {STATUS[c.programmeStatus]}
                </span>
              </p>
              {c.passages.length === 0 ? (
                <p className={`mt-3 text-[0.95rem] ${MUTED}`}>
                  Aucun passage ne contient ces termes.
                </p>
              ) : (
                <>
                  <Passages passages={c.passages.slice(0, SHOWN)} />
                  {c.passages.length > SHOWN && (
                    <details className="group mt-3">
                      <summary className="cursor-pointer text-[0.9rem] font-bold text-[#0B1A2A]">
                        {c.passages.length - SHOWN === 1
                          ? '1 autre passage'
                          : `${c.passages.length - SHOWN} autres passages`}
                      </summary>
                      <Passages passages={c.passages.slice(SHOWN)} />
                    </details>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Passages({
  passages,
}: {
  passages: TopicSheet['candidates'][number]['passages']
}) {
  return (
    <ul className="mt-4 space-y-4">
      {passages.map((p, i) => (
        <li
          key={i}
          className="rounded-[20px] bg-white p-5 text-[0.98rem] leading-relaxed"
        >
          <p className={`text-[0.8rem] font-semibold ${MUTED}`}>{p.heading}</p>
          <blockquote className="mt-2 text-[#0B1A2A]">« {p.quote} »</blockquote>
          <a
            href={p.document.url}
            target="_blank"
            rel="noreferrer"
            className={`mt-3 inline-flex items-center gap-1 text-[0.8rem] ${MUTED} no-underline hover:underline`}
          >
            {p.document.title}
            {p.document.fetchedAt
              ? `, lu le ${frenchDate(p.document.fetchedAt)}`
              : ''}
            <ArrowUpRight size={12} />
          </a>
        </li>
      ))}
    </ul>
  )
}
