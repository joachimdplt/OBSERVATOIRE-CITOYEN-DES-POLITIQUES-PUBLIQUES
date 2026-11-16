import { createFileRoute, Link } from '@tanstack/react-router'
import { useCandidateChecks } from '../../hooks/checks/useChecks'
import type { CandidateChecks } from '../../types/checks'

export const Route = createFileRoute('/_admin/verification/')({
  component: VerificationPage,
})

const pct = (x: number) => `${Math.round(x * 100)} %`

/**
 * La vérification, sobre : trois chiffres, puis un candidat par ligne avec
 * sa progression et son taux. Le nombre de cartes vise une marge de ± 10
 * points ; un petit candidat se vérifie en entier.
 */
function VerificationPage() {
  const checks = useCandidateChecks()
  const list = checks.data ?? []
  const target = list.reduce((n, c) => n + c.target, 0)
  const checked = list.reduce((n, c) => n + Math.min(c.checked, c.target), 0)
  const done = list.filter((c) => c.checked >= c.target).length
  const toReclass = list.reduce((n, c) => n + c.toReclass, 0)
  const pairs = list.reduce((n, c) => n + (c.agreement?.pairs ?? 0), 0)
  const agreed = list.reduce((n, c) => n + (c.agreement?.agreed ?? 0), 0)

  return (
    <>
      {checks.data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            value={`${checked}`}
            label="cartes vérifiées"
            note={`sur ${target} visées`}
          />
          <Stat
            value={`${done}`}
            label="candidats terminés"
            note={`sur ${list.length}`}
          />
          <Stat
            value={`${toReclass}`}
            label="à reclasser"
            note="refus pas encore rangés"
          />
          <Stat
            value={pairs > 0 ? pct(agreed / pairs) : 'non mesuré'}
            label="accord à deux"
            note={
              pairs > 0
                ? `${agreed} sur ${pairs} lus deux fois`
                : 'une seconde personne relit'
            }
          />
        </div>
      )}

      {checks.data && (
        <ul className="surface divide-y divide-white/70 overflow-hidden">
          {list.map((c) => (
            <Row key={c.id} c={c} />
          ))}
        </ul>
      )}
    </>
  )
}

function Row({ c }: { c: CandidateChecks }) {
  const done = c.checked >= c.target
  const rate = c.rate.measured ? pct(c.rate.rate) : null
  return (
    <li className="flex items-center transition-colors hover:bg-white/60">
      <Link
        to="/verification/$candidateId"
        params={{ candidateId: c.id }}
        className="flex flex-1 items-center gap-5 px-5 py-3.5"
      >
        <span className="w-48 shrink-0 font-semibold text-[#0B1A2A]">
          {c.name}
        </span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0B1A2A]/8">
          <span
            className="block h-full rounded-full bg-[#0B1A2A]"
            style={{ width: `${Math.min(100, (c.checked / c.target) * 100)}%` }}
          />
        </span>
        <span className="w-16 text-right text-sm text-[#5B6470] tabular-nums">
          {c.checked} / {c.target}
        </span>
        <span
          className={`w-24 text-right text-sm font-semibold tabular-nums ${done ? 'text-[#0B1A2A]' : 'text-[#5B6470]/60'}`}
          title={
            done
              ? 'Taux de rangements justes'
              : 'Échantillon pas encore atteint'
          }
        >
          {rate ?? 'non mesuré'}
        </span>
      </Link>
      <span className="flex w-56 shrink-0 justify-end gap-1.5 pr-4">
        {c.secondReads > 0 && (
          <Link
            to="/verification/$candidateId"
            params={{ candidateId: c.id }}
            className="nav-pill h-7 px-3 text-xs"
          >
            {c.secondReads} à relire
          </Link>
        )}
        {c.toReclass > 0 && (
          <Link
            to="/reclasser/$candidateId"
            params={{ candidateId: c.id }}
            className="nav-pill nav-pill-active h-7 px-3 text-xs"
          >
            {c.toReclass} à reclasser
          </Link>
        )}
      </span>
    </li>
  )
}

/** Un chiffre clé, son titre à côté. */
function Stat({
  value,
  label,
  note,
}: {
  value: string
  label: string
  note: string
}) {
  return (
    <div className="surface flex items-center gap-4 px-5 py-4">
      {/* Un chiffre en grand ; un mot (« non mesuré ») plus petit, sans
          coupure. */}
      <p
        className={`shrink-0 text-left font-extrabold tracking-tight whitespace-nowrap text-[#0B1A2A] tabular-nums ${
          /\d/.test(value) ? 'text-3xl' : 'text-base text-[#5B6470]'
        }`}
      >
        {value}
      </p>
      <div className="min-w-0 text-left">
        <p className="text-left text-sm font-semibold text-[#0B1A2A]">
          {label}
        </p>
        <p className="text-left text-xs text-[#5B6470]">{note}</p>
      </div>
    </div>
  )
}
