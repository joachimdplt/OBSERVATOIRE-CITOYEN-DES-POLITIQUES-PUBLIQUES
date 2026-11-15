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
        <Facts approach={approach} />
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
        {a.chapters.length} chapitres, {indicators} indicateurs, chacun avec
        la source que sa campagne cite.
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
              Ses {c.indicators.length} indicateurs, chiffres et sources, sur
              son site
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
      <ul className="mt-6 max-w-[720px] divide-y divide-[#0B1A2A]/8 border-y border-[#0B1A2A]/8">
        {subjects.map((s) => (
          <li
            key={s.label}
            className="flex items-baseline justify-between gap-4 py-2.5"
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

/**
 * Les comptes de sa démarche : ce que contient son état des lieux, et les
 * totaux que sa consultation publie, cités tels quels.
 */
function Facts({ approach }: { approach: Approach[] }) {
  const facts: { value: string; label: string }[] = []
  for (const a of approach) {
    if (a.kind === 'method') {
      const indicators = a.chapters.reduce(
        (n, c) => n + c.indicators.length,
        0,
      )
      facts.push({ value: String(a.chapters.length), label: 'chapitres d’état des lieux' })
      facts.push({ value: String(indicators), label: 'indicateurs, sources citées' })
    }
    for (const c of a.counts.filter((x) => !x.label)) {
      const m = /^(\D*?)(\d[\d\s]*)\s+(.*)$/.exec(c.text)
      if (m) facts.push({ value: m[2].trim(), label: `${m[3]} (consultation)` })
    }
    const subjects = a.counts.filter((c) => c.label).length
    if (subjects)
      facts.push({ value: String(subjects), label: 'sujets ouverts à la consultation' })
  }
  if (facts.length === 0) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {facts.map((f) => (
        <div key={f.label} className="rounded-[22px] bg-white p-5">
          <p className="text-[2rem] leading-none font-extrabold tracking-[-0.03em] text-[#0B1A2A] tabular-nums">
            {f.value}
          </p>
          <p className={`mt-2 text-[0.9rem] leading-snug ${MUTED}`}>{f.label}</p>
        </div>
      ))}
    </div>
  )
}
