import { Link } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import type { ElectionSheet, ProgrammeStatus } from '../../../types/public'
import { CandidatePortrait } from '../../molecules/CandidatePortrait'
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
 * une carte par candidat, dans un ordre tiré au hasard à chaque visite, avec
 * la source de sa déclaration et le lien vers ce qu'il a publié.
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

        <p className={`mt-8 text-[0.88rem] ${MUTED}`}>
          Ordre tiré au hasard à chaque visite : aucun candidat n’ouvre la liste
          deux fois de suite.
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => {
            const state = STATES.find((s) => s.status === c.programmeStatus)
            return (
              <li
                key={c.slug}
                className="flex min-w-0 flex-col rounded-[24px] bg-white p-6"
              >
                <CandidatePortrait
                  name={c.name}
                  photo={c.photo}
                  className="mb-4"
                />
                <Link
                  to="/candidats/$slug"
                  params={{ slug: c.slug }}
                  className="text-[1.2rem] leading-tight font-extrabold tracking-[-0.02em] text-[#0B1A2A] no-underline hover:underline"
                >
                  {c.name}
                </Link>
                <p className={`mt-1 text-[0.88rem] ${MUTED}`}>
                  {c.party ?? 'Sans étiquette'}
                </p>
                <p className={`mt-1 text-[0.82rem] ${MUTED}`}>
                  Candidature déclarée le{' '}
                  <a
                    href={c.declarationSource}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-[#0B1A2A]/25 underline-offset-2 hover:decoration-[#0B1A2A]"
                  >
                    {frenchDate(c.declaredAt)}
                  </a>
                </p>
                <p className="mt-4 flex flex-wrap items-center gap-3">
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
                      className="inline-flex items-center gap-1 text-[0.85rem] font-bold text-[#0B1A2A] no-underline hover:underline"
                    >
                      Lire <ArrowUpRight size={14} />
                    </a>
                  )}
                </p>
                {c.programmeNote && (
                  <p className={`mt-2 text-[0.82rem] leading-snug ${MUTED}`}>
                    {c.programmeNote}
                  </p>
                )}
                <Link
                  to="/candidats/$slug"
                  params={{ slug: c.slug }}
                  className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[0.88rem] font-bold text-[#0B1A2A] no-underline hover:underline"
                >
                  Sa page <ArrowRight size={15} />
                </Link>
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
