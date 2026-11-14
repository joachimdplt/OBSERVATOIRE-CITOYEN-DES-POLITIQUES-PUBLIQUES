import {
  Link,
  createFileRoute,
  notFound,
  useNavigate,
} from '@tanstack/react-router'
import { z } from 'zod'
import { Term } from '../components/atoms/Term'
import { PublicationBadge } from '../components/molecules/PublicationBadge'
import { MapPanel } from '../components/organisms/map/MapPanel'
import { ObservationsTable } from '../components/organisms/indicators/ObservationsTable'
import { ProvenancePanel } from '../components/organisms/indicators/ProvenancePanel'
import { pillarLabel } from '../data/pillars'
import { getIndicator, listObservations } from '../services/public-api'
import { seo } from '../utils/seo'

const search = z.object({
  territory: z.string().optional(),
  name: z.string().optional(),
  period: z.string().optional(),
})

export const Route = createFileRoute('/indicators/$code')({
  validateSearch: search,
  loaderDeps: ({ search: s }) => ({ territory: s.territory }),
  loader: async ({ params, deps }) => {
    const sheet = await getIndicator({ data: { code: params.code } })
    if (!sheet) throw notFound()
    const selected = deps.territory
      ? ((
          await listObservations({
            data: { code: params.code, territory: deps.territory, offset: 0 },
          })
        )?.observations ?? [])
      : null
    return { sheet, selected }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({
          title: loaderData.sheet.label,
          description: loaderData.sheet.definition,
        })
      : [],
  }),
  component: IndicatorPage,
})

function IndicatorPage() {
  const { sheet, selected } = Route.useLoaderData()
  const filters = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [latest] = sheet.provenance
  const period = filters.period ?? sheet.periods[sheet.periods.length - 1]

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs text-slate-500">
          {pillarLabel(sheet.pillar)} · source {latest.producer.acronym}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {sheet.label}
        </h1>
        <p className="text-sm text-slate-600">{sheet.unit}</p>
        <PublicationBadge status={latest.status} label={latest.statusLabel} />
      </header>

      <MapPanel
        code={sheet.code}
        unit={sheet.unit}
        periods={sheet.periods}
        period={period}
        selected={
          filters.territory
            ? {
                code: filters.territory,
                name: filters.name ?? filters.territory,
                observations: selected,
              }
            : null
        }
        onPeriod={(p) =>
          navigate({ search: (s) => ({ ...s, period: p }), replace: true })
        }
        onSelect={(t) =>
          navigate({
            search: (s) => ({ ...s, territory: t.code, name: t.name }),
            replace: true,
            resetScroll: false,
          })
        }
        onClose={() =>
          navigate({
            search: (s) => ({ ...s, territory: undefined, name: undefined }),
            replace: true,
            resetScroll: false,
          })
        }
      />

      <details className="surface group p-5" open>
        <summary className="cursor-pointer text-sm font-semibold">
          Comment lire ce chiffre
        </summary>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <Term label="Définition">{sheet.definition}</Term>
          <Term label="Limites">{sheet.limits}</Term>
          <Term label="Champ">{sheet.scope}</Term>
          <Term label="Méthode">{sheet.method}</Term>
        </dl>
      </details>

      <details className="space-y-4">
        <summary className="cursor-pointer text-sm font-semibold">
          D’où viennent ces chiffres
        </summary>
        <div className="mt-4 space-y-4">
          {sheet.provenance.map((p) => (
            <ProvenancePanel key={p.version.vintage} provenance={p} />
          ))}
        </div>
      </details>

      {selected && selected.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            Le détail, ligne du fichier comprise
          </summary>
          <div className="mt-4">
            <ObservationsTable observations={selected} unit={sheet.unit} />
          </div>
        </details>
      )}

      <p className="text-xs text-slate-400">
        <Link to="/" className="underline">
          Tous les indicateurs
        </Link>
      </p>
    </main>
  )
}
