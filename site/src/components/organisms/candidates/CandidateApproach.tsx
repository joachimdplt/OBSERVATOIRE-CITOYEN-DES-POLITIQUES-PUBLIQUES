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
        <p className={`text-justify text-[1rem] leading-relaxed hyphens-auto ${MUTED}`}>
          Pas de programme d’ensemble : un état des lieux chiffré et une
          consultation ouverte, repris tels qu’ils sont publiés (relevé le{' '}
          {frenchDate(
            approach
              .map((a) => a.fetchedAt)
              .sort()
              .at(-1)!
              .slice(0, 10),
          )}
          ).
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
    </div>
  )
}

function Diagnosis({ approach: a }: { approach: Approach }) {
  return (
    <div className="rounded-[28px] glass p-6 md:p-8">
      <Head kicker="Son état des lieux" approach={a} />
      <ol className="mt-8 space-y-10">
        {a.chapters.map((c) => (
          <li key={c.title}>
            <h3 className={`${DISPLAY} text-[1.25rem] leading-snug`}>
              «&nbsp;{c.title}&nbsp;»
            </h3>
            {c.intro && (
              <p className="mt-2 max-w-[70ch] text-[1rem] leading-relaxed text-[#0B1A2A]">
                «&nbsp;{c.intro}&nbsp;»
              </p>
            )}
            {/* Les indicateurs, par leur nom : leurs chiffres et leurs
                sources se lisent sur sa page, à laquelle chaque chapitre
                mène. */}
            <ul className="mt-4 divide-y divide-[#0B1A2A]/8 border-y border-[#0B1A2A]/8">
              {c.indicators.map((i) => (
                <li key={i.name} className="py-2 text-[0.95rem] text-[#0B1A2A]">
                  {i.name}
                  {i.unit && (
                    <span className={`ml-2 text-[0.82rem] ${MUTED}`}>
                      {i.unit}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <a
              href={c.anchor ? `${a.url}#${c.anchor}` : a.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[0.9rem] font-bold text-[#0B1A2A] no-underline hover:underline"
            >
              Chiffres et sources
              <ArrowUpRight size={14} />
            </a>
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
    <div className="rounded-[28px] glass p-6 md:p-8">
      <Head kicker="Sa consultation" approach={a} />
      {totals.map((t) => (
        <p
          key={t.text}
          className={`${DISPLAY} mt-5 text-[clamp(1.3rem,2.4vw,1.8rem)] leading-tight`}
        >
          «&nbsp;{t.text}&nbsp;»
        </p>
      ))}
      <p className={`mt-3 text-justify text-[0.9rem] leading-relaxed hyphens-auto ${MUTED}`}>
        Les comptes que la consultation publie, thème par thème. Les problèmes
        et les solutions sont déposés par les participants : ce ne sont pas les
        mots de la candidate, et ils ne sont pas cités ici.
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {subjects.map((s) => {
          const counts = countsOf(s.text)
          return (
            <li key={s.label} className="rounded-[18px] bg-[#F4F6F8] px-4 py-3">
              <p className="text-[0.95rem] font-extrabold text-[#0B1A2A]">
                {s.label}
              </p>
              {counts ? (
                <dl className="mt-1.5 flex gap-5 text-[0.82rem]">
                  {counts.map((c) => (
                    <div key={c.what} className="flex items-baseline gap-1.5">
                      <dt className="sr-only">{c.what}</dt>
                      <dd className="font-bold text-[#0B1A2A] tabular-nums">
                        {c.value}
                      </dd>
                      <span className={MUTED}>{c.what}</span>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className={`mt-1.5 text-[0.82rem] ${MUTED}`}>{s.text}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** « 161 problèmes · 223 solutions » se lit en deux comptes, tels quels. */
function countsOf(text: string) {
  const parts = text.split('·').map((p) => /^\s*(\d[\d\s]*)\s+(\S.*?)\s*$/.exec(p))
  if (parts.some((m) => !m)) return null
  return parts.map((m) => ({ value: m![1].trim(), what: m![2] }))
}

