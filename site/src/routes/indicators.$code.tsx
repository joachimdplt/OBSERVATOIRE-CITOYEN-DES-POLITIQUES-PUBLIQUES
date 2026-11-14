import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { z } from 'zod'
import { Card } from '../components/atoms/Card'
import { Term } from '../components/atoms/Term'
import { PublicationBadge } from '../components/molecules/PublicationBadge'
import { ObservationsTable } from '../components/organisms/indicators/ObservationsTable'
import { ProvenancePanel } from '../components/organisms/indicators/ProvenancePanel'
import { pillarLabel } from '../data/pillars'
import { getIndicator, listObservations } from '../services/public-api'
import { seo } from '../utils/seo'

const search = z.object({
  territory: z.string().optional(),
  period: z.string().optional(),
  offset: z.number().int().min(0).optional(),
})

export const Route = createFileRoute('/indicators/$code')({
  validateSearch: search,
  loaderDeps: ({ search: s }) => s,
  loader: async ({ params, deps }) => {
    const sheet = await getIndicator({ data: { code: params.code } })
    if (!sheet) throw notFound()
    const page = await listObservations({
      data: { code: params.code, ...deps, offset: deps.offset ?? 0 },
    })
    return {
      sheet,
      page: page ?? { total: 0, limit: 50, offset: 0, observations: [] },
    }
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
  const { sheet, page } = Route.useLoaderData()
  const filters = Route.useSearch()
  const { provenance } = sheet
  const next =
    page.offset + page.limit < page.total ? page.offset + page.limit : null
  const previous =
    page.offset > 0 ? Math.max(page.offset - page.limit, 0) : null

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs text-slate-500">
          {pillarLabel(sheet.pillar)} · {provenance.producer.acronym} ·
          millésime {provenance.version.vintage}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {sheet.label}
        </h1>
        <PublicationBadge
          status={provenance.status}
          label={provenance.statusLabel}
        />
      </header>

      <Card title="L’indicateur">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Term label="Définition">{sheet.definition}</Term>
          <Term label="Champ">{sheet.scope}</Term>
          <Term label="Unité">{sheet.unit}</Term>
          <Term label="Méthode">{sheet.method}</Term>
          <Term label="Limites">{sheet.limits}</Term>
          <Term label="Agrégations permises">
            {sheet.allowedAggregations.length === 0
              ? 'Aucune : ces valeurs ne s’additionnent ni ne se moyennent.'
              : sheet.allowedAggregations
                  .map((a) => (a === 'sum' ? 'somme' : 'moyenne'))
                  .join(', ')}
          </Term>
        </dl>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Les valeurs</h2>
          <form className="flex flex-wrap items-end gap-2" method="get">
            <label className="space-y-1 text-xs text-slate-500">
              Code du territoire
              <input
                name="territory"
                defaultValue={filters.territory}
                placeholder="01001"
                className="field h-9 w-32"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              Période
              <select
                name="period"
                defaultValue={filters.period ?? ''}
                className="field h-9 w-32"
              >
                <option value="">Toutes</option>
                {sheet.periods.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <button className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm hover:bg-slate-50">
              Filtrer
            </button>
          </form>
        </div>
        <p className="text-xs text-slate-500">
          {page.total} valeur{page.total > 1 ? 's' : ''}. Une absence s’écrit en
          toutes lettres, jamais zéro.
        </p>
        <ObservationsTable observations={page.observations} unit={sheet.unit} />
        <nav className="flex justify-between text-sm">
          {previous !== null ? (
            <Link
              to="."
              search={{ ...filters, offset: previous }}
              className="underline"
            >
              Précédentes
            </Link>
          ) : (
            <span />
          )}
          {next !== null && (
            <Link
              to="."
              search={{ ...filters, offset: next }}
              className="underline"
            >
              Suivantes
            </Link>
          )}
        </nav>
      </section>

      <ProvenancePanel provenance={provenance} />
    </main>
  )
}
