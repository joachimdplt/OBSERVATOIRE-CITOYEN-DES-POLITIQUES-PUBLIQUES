import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { ElectionSheet, ProgrammeStatus } from '../../../types/public'
import { frenchDate } from '../../../utils/date'
import { CandidatePortrait } from '../../molecules/CandidatePortrait'

const MUTED = 'text-[#5B6470]'

const STATES: { status: ProgrammeStatus; count: string; one: string }[] = [
  {
    status: 'complete',
    count: 'programmes complets',
    one: 'Programme complet',
  },
  { status: 'partial', count: 'partiels', one: 'Documents partiels' },
  { status: 'none', count: 'sans programme', one: 'Rien de publié' },
]

/**
 * Les candidats déclarés, en premier sur l'accueil : combien ont publié un
 * programme, puis une carte par candidat (photo, parti, état du programme),
 * dans un ordre tiré au hasard à chaque visite. Le détail est sur sa page.
 */
export function HomeProgrammes({ election }: { election: ElectionSheet }) {
  const { candidates } = election
  const count = (s: ProgrammeStatus) =>
    candidates.filter((c) => c.programmeStatus === s).length
  const checkedAt = candidates
    .map((c) => c.programmeCheckedAt)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1)

  return (
    <section id="candidats" className="scroll-mt-14 px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] leading-tight font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          {election.name} : {candidates.length} candidats
        </h2>
        <p className="mt-3 text-[1.15rem] font-semibold text-[#0B1A2A]">
          {count('none')} sur {candidates.length} n’ont publié aucun programme
          {checkedAt ? ` au ${frenchDate(checkedAt)}` : ''}.
        </p>
        <p className="mt-4 flex flex-wrap gap-2 text-[0.9rem] font-semibold text-[#0B1A2A]">
          {STATES.map((s) => (
            <span key={s.status} className="rounded-full bg-white px-3 py-1">
              {count(s.status)} {s.count}
            </span>
          ))}
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {candidates.map((c) => {
            const state = STATES.find((s) => s.status === c.programmeStatus)
            return (
              <li key={c.slug} className="min-w-0">
                <Link
                  to="/candidats/$slug"
                  params={{ slug: c.slug }}
                  className="group flex h-full flex-col rounded-[22px] bg-white p-3 no-underline"
                >
                  <CandidatePortrait name={c.name} photo={c.photo} plain />
                  <span className="mt-3 px-1 leading-tight font-extrabold text-[#0B1A2A] group-hover:underline">
                    {c.name}
                  </span>
                  <span
                    className={`mt-0.5 px-1 text-[0.8rem] leading-snug ${MUTED}`}
                  >
                    {c.party ?? 'Sans étiquette'}
                  </span>
                  <span className="flex-1" />
                  <span
                    className={`mx-1 mt-3 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold ${
                      c.programmeStatus === 'complete'
                        ? 'bg-[#0B1A2A] text-white'
                        : c.programmeStatus === 'partial'
                          ? 'text-[#0B1A2A] ring-1 ring-[#0B1A2A]/30'
                          : 'text-[#5B6470] ring-1 ring-[#0B1A2A]/10'
                    }`}
                  >
                    {state?.one}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to="/enjeux"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1A2A] px-6 font-extrabold text-white no-underline hover:opacity-90"
          >
            Les enjeux dans leurs programmes <ArrowRight size={17} />
          </Link>
          <p className={`text-[0.85rem] ${MUTED}`}>
            Ordre tiré au hasard à chaque visite. Photos sous licence libre,
            créditées sur la page de chaque candidat.
          </p>
        </div>
      </div>
    </section>
  )
}
