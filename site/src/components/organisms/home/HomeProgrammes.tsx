import { Link } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import type { ElectionSheet, ProgrammeStatus } from '../../../types/public'
import { frenchDate } from '../../../utils/date'

const MUTED = 'text-[#5B6470]'

const STATES: { status: ProgrammeStatus; label: string; one: string }[] = [
  {
    status: 'complete',
    label: 'avec un programme complet',
    one: 'Programme complet',
  },
  {
    status: 'partial',
    label: 'avec des documents partiels',
    one: 'Documents partiels',
  },
  { status: 'none', label: 'sans rien de publié', one: 'Rien de publié' },
]

/**
 * L'état des programmes de l'élection : combien de candidats déclarés ont
 * publié un programme complet, des documents partiels, ou rien encore. Puis
 * chaque candidat, dans l'ordre alphabétique, avec la source de sa
 * déclaration et le lien vers ce qu'il a publié.
 */
export function HomeProgrammes({ election }: { election: ElectionSheet }) {
  const { candidates } = election
  const checkedAt = candidates
    .map((c) => c.programmeCheckedAt)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1)
  const count = (s: ProgrammeStatus) =>
    candidates.filter((c) => c.programmeStatus === s).length

  return (
    <section
      id="candidats"
      className="scroll-mt-14 bg-[#F4F6F8] px-6 py-20 md:px-10"
    >
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] leading-tight font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          {election.name} : les programmes publiés
        </h2>
        <p
          className={`mt-4 max-w-[70ch] text-[1.05rem] leading-relaxed ${MUTED}`}
        >
          {candidates.length} candidats déclarés
          {checkedAt ? `, état constaté le ${frenchDate(checkedAt)}` : ''}. La
          plupart n’ont pas encore publié de programme : l’observatoire ne peut
          rapprocher des chiffres que les textes qui existent.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {STATES.map((s) => (
            <li key={s.status} className="rounded-[22px] bg-white p-5">
              <p className="text-[2.4rem] leading-none font-extrabold tracking-[-0.03em] text-[#0B1A2A] tabular-nums">
                {count(s.status)}
              </p>
              <p className={`mt-2 text-[0.95rem] font-semibold ${MUTED}`}>
                {s.label}
              </p>
            </li>
          ))}
        </ul>

        <ul className="mt-8 divide-y divide-[#0B1A2A]/8 rounded-[28px] bg-white px-6 md:px-8">
          {candidates.map((c) => {
            const state = STATES.find((s) => s.status === c.programmeStatus)
            return (
              <li
                key={c.slug}
                className="grid gap-2 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-8"
              >
                <div>
                  <Link
                    to="/candidats/$slug"
                    params={{ slug: c.slug }}
                    className="font-bold text-[#0B1A2A] no-underline hover:underline"
                  >
                    {c.name}
                  </Link>
                  <p className={`text-[0.88rem] ${MUTED}`}>
                    {c.party ?? 'Sans étiquette'} · candidature déclarée le{' '}
                    <a
                      href={c.declarationSource}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-[#0B1A2A]/25 underline-offset-2 hover:decoration-[#0B1A2A]"
                    >
                      {frenchDate(c.declaredAt)}
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-[0.95rem]">
                    <span
                      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-bold ${
                        c.programmeStatus === 'complete'
                          ? 'bg-[#0B1A2A] text-white'
                          : c.programmeStatus === 'partial'
                            ? 'text-[#0B1A2A] ring-1 ring-[#0B1A2A]/30'
                            : 'text-[#5B6470] ring-1 ring-[#0B1A2A]/10'
                      }`}
                    >
                      {state?.one}
                    </span>
                    {c.programmeUrl && (
                      <a
                        href={c.programmeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-3 inline-flex items-center gap-1 text-[0.88rem] font-bold text-[#0B1A2A] no-underline hover:underline"
                      >
                        Lire <ArrowUpRight size={14} />
                      </a>
                    )}
                  </p>
                  {c.programmeNote && (
                    <p className={`mt-1.5 text-[0.88rem] ${MUTED}`}>
                      {c.programmeNote}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <Link
          to="/enjeux"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1A2A] px-6 font-extrabold text-white no-underline hover:opacity-90"
        >
          Les enjeux dans ces programmes <ArrowRight size={17} />
        </Link>
        <p className={`mt-6 max-w-[70ch] text-[0.88rem] ${MUTED}`}>
          Critère d’inscription : {election.criterion.charAt(0).toLowerCase()}
          {election.criterion.slice(1)} Un candidat absent ou un programme paru
          depuis se signale par la page Contribuer.
        </p>
      </div>
    </section>
  )
}
