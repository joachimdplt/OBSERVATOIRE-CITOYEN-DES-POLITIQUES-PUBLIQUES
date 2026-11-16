import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ElectionSheet, ProgrammeStatus } from '../../../types/public'
import { CandidatePortrait } from '../../molecules/CandidatePortrait'

const MUTED = 'text-[#5B6470]'

/**
 * Un seul fait, sans degré : un programme est collecté, ou non. Dire
 * « complet » ou « partiel » jugerait un document qui n'est pas le nôtre.
 */
type Group = 'with' | 'without'
const groupOf = (s: ProgrammeStatus): Group =>
  s === 'none' ? 'without' : 'with'
const GROUPS: { group: Group; count: string; one: string }[] = [
  { group: 'with', count: 'avec un programme', one: 'Avec un programme' },
  {
    group: 'without',
    count: 'sans programme collecté',
    one: 'Sans programme collecté',
  },
]

/**
 * Les candidats déclarés, en premier sur l'accueil : combien ont publié un
 * programme, puis une carte par candidat (photo, parti, état du programme),
 * dans un ordre tiré au hasard à chaque visite. Le détail est sur sa page.
 */
export function HomeProgrammes({ election }: { election: ElectionSheet }) {
  const { candidates } = election
  // Un filtre : avec ou sans programme ; un second clic le retire.
  const [only, setOnly] = useState<Group | null>(null)
  const shown = only
    ? candidates.filter((c) => groupOf(c.programmeStatus) === only)
    : candidates
  const count = (g: Group) =>
    candidates.filter((c) => groupOf(c.programmeStatus) === g).length

  return (
    <section id="candidats" className="scroll-mt-14 px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] leading-tight font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          {election.name} : {candidates.length} candidats
        </h2>
        <p className={`mt-1.5 text-[0.85rem] ${MUTED}`}>
          Les programmes sont susceptibles d’évoluer : nous les relisons
          chaque matin. Ordre tiré au hasard à chaque visite. Photos sous
          licence libre, créditées sur la page de chaque candidat.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[0.9rem] font-semibold">
          <Chip active={only === null} onClick={() => setOnly(null)}>
            Tous · {candidates.length}
          </Chip>
          {GROUPS.map((g) => (
            <Chip
              key={g.group}
              active={only === g.group}
              onClick={() => setOnly(only === g.group ? null : g.group)}
            >
              {count(g.group)} {g.count}
            </Chip>
          ))}
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {shown.map((c) => {
            const group = groupOf(c.programmeStatus)
            const state = GROUPS.find((g) => g.group === group)
            return (
              <li key={c.slug} className="min-w-0">
                <Link
                  to="/candidats/$slug"
                  params={{ slug: c.slug }}
                  className="group flex h-full flex-col rounded-[22px] glass p-3 no-underline"
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
                      group === 'with'
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
            to="/sujets"
            className="inline-flex h-12 items-center gap-2 rounded-full glass-dark px-6 font-extrabold text-white no-underline hover:opacity-90"
          >
            Les sujets de leurs programmes <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/** Une pastille de filtre : pleine quand elle est choisie. */
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 rounded-full px-4 transition-colors ${
        active
          ? 'bg-[#0B1A2A] text-white'
          : 'bg-white text-[#0B1A2A] hover:bg-[#E8ECF0]'
      }`}
    >
      {children}
    </button>
  )
}
