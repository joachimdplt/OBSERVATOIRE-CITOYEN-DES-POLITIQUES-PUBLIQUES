import { createFileRoute, Link } from '@tanstack/react-router'
import { PageHeader } from '../../components/atoms/PageHeader'
import { useCandidateChecks } from '../../hooks/checks/useChecks'
import { formatRate } from '../../utils/rate'

export const Route = createFileRoute('/_admin/verification/')({
  component: VerificationPage,
})

/**
 * La vérification candidat par candidat. Le nombre de cartes vise une
 * marge de ± 10 points ; un petit candidat se vérifie en entier.
 */
function VerificationPage() {
  const checks = useCandidateChecks()
  return (
    <>
      <PageHeader
        title="Vérification"
        lead="Une carte par rangement, tirée au hasard. Vous dites si le sujet est juste. Seuls vos verdicts servent à mesurer la fiabilité : les décisions prises par un assistant ne comptent pas."
      />
      {checks.data && (
        <ul className="surface divide-y divide-slate-100">
          {checks.data.map((c) => {
            const done = c.checked >= c.target
            return (
              <li key={c.id}>
                <Link
                  to="/verification/$candidateId"
                  params={{ candidateId: c.id }}
                  className="flex items-center gap-6 px-5 py-4 hover:bg-slate-50"
                >
                  <span className="w-48 shrink-0 font-medium text-slate-900">
                    {c.name}
                  </span>
                  <span className="flex flex-1 items-center gap-3">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full bg-slate-900"
                        style={{
                          width: `${Math.min(100, (c.checked / c.target) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="w-20 text-right text-sm tabular-nums text-slate-500">
                      {Math.min(c.checked, c.target)} / {c.target}
                    </span>
                  </span>
                  <span
                    className={`w-72 text-right text-sm ${done ? 'text-slate-900' : 'text-slate-400'}`}
                  >
                    {formatRate(c.rate)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
