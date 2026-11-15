import { ArrowUpRight } from 'lucide-react'
import type { CandidateProgramme } from '../../../types/public'
import { frenchDate } from '../../../utils/date'

type Approach = CandidateProgramme['approach'][number]

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

/**
 * La démarche d'un candidat qui ne publie pas de programme : son diagnostic
 * chiffré, chapitre par chapitre, avec les sources que sa campagne cite, et
 * sa consultation, par les seuls comptes qu'elle publie sur elle-même. Les
 * mots des participants ne sont pas repris : ce sont les leurs, pas les
 * siens.
 */
export function CandidateApproach({ approach }: { approach: Approach[] }) {
  if (approach.length === 0) return null
  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
          Sa démarche
        </h2>
        <p className={`max-w-[68ch] text-[1rem] leading-relaxed ${MUTED}`}>
          Sa campagne ne publie pas de programme d’ensemble. Elle publie un
          état des lieux chiffré et tient une consultation ouverte. Les deux
          sont repris ici tels qu’ils sont publiés, avec la date du relevé.
        </p>
        {approach.map((a) =>
          a.kind === 'method' ? (
            <Diagnosis key={a.url} approach={a} />
          ) : (
            <Consultation key={a.url} approach={a} />
          ),
        )}
      </div>
    </section>
  )
}

function Head({ kicker, approach: a }: { kicker: string; approach: Approach }) {
  return (
    <div>
      <p className={`text-[0.85rem] font-bold ${MUTED}`}>{kicker}</p>
      <a
        href={a.url}
        target="_blank"
        rel="noreferrer"
        className={`${DISPLAY} mt-1 inline-flex items-center gap-2 text-[1.5rem] no-underline hover:underline`}
      >
        {a.title}
        <ArrowUpRight size={18} />
      </a>
      <p className={`mt-1 text-[0.85rem] ${MUTED}`}>
        Relevé le {frenchDate(a.fetchedAt.slice(0, 10))}
      </p>
    </div>
  )
}

function Diagnosis({ approach: a }: { approach: Approach }) {
  const indicators = a.chapters.reduce((n, c) => n + c.indicators.length, 0)
  return (
    <div className="rounded-[28px] bg-white p-6 md:p-8">
      <Head kicker="Son état des lieux" approach={a} />
      <p className={`mt-3 text-[0.95rem] ${MUTED}`}>
        {a.chapters.length} chapitres, {indicators} indicateurs. Chaque
        phrase est celle de sa campagne ; la source est celle qu’elle cite.
      </p>
      <ol className="mt-8 space-y-10">
        {a.chapters.map((c) => (
          <li key={c.title}>
            <p className={`text-[0.85rem] font-bold ${MUTED}`}>{c.label}</p>
            <h3 className={`${DISPLAY} mt-1 text-[1.25rem] leading-snug`}>
              «&nbsp;{c.title}&nbsp;»
            </h3>
            {c.intro && (
              <p className="mt-2 max-w-[70ch] text-[1rem] leading-relaxed text-[#0B1A2A]">
                «&nbsp;{c.intro}&nbsp;»
              </p>
            )}
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {c.indicators.map((i) => (
                <li
                  key={i.name}
                  className="flex flex-col rounded-[18px] bg-[#F4F6F8] p-4"
                >
                  <span className="leading-tight font-extrabold text-[#0B1A2A]">
                    {i.name}
                  </span>
                  <span className={`mt-0.5 text-[0.8rem] ${MUTED}`}>
                    {i.unit}
                  </span>
                  <span className="mt-3 text-[0.95rem] leading-snug text-[#0B1A2A]">
                    «&nbsp;{i.sentence}&nbsp;»
                  </span>
                  <span className="flex-1" />
                  <span className={`mt-3 text-[0.75rem] leading-snug ${MUTED}`}>
                    Source citée :{' '}
                    {i.sourceUrl ? (
                      <a
                        href={i.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-[#0B1A2A]/20 underline-offset-2"
                      >
                        {i.source}
                      </a>
                    ) : (
                      i.source
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Consultation({ approach: a }: { approach: Approach }) {
  const totals = a.counts.filter((c) => !c.label)
  const subjects = a.counts.filter((c) => c.label)
  return (
    <div className="rounded-[28px] bg-white p-6 md:p-8">
      <Head kicker="Sa consultation" approach={a} />
      {totals.map((t) => (
        <p
          key={t.text}
          className={`${DISPLAY} mt-5 text-[clamp(1.3rem,2.4vw,1.8rem)] leading-tight`}
        >
          «&nbsp;{t.text}&nbsp;»
        </p>
      ))}
      <p className={`mt-3 max-w-[68ch] text-[0.95rem] leading-relaxed ${MUTED}`}>
        Les comptes que la consultation publie, sujet par sujet. Les problèmes
        et solutions déposés sont les mots des participants, pas ceux de la
        candidate : ils ne sont pas cités ici.
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <li
            key={s.label}
            className="flex items-baseline justify-between gap-3 rounded-[14px] bg-[#F4F6F8] px-4 py-3"
          >
            <span className="font-bold text-[#0B1A2A]">{s.label}</span>
            <span className={`shrink-0 text-[0.85rem] tabular-nums ${MUTED}`}>
              {s.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
