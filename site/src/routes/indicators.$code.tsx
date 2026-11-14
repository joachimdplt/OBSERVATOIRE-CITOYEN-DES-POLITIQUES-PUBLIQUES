import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Map as MapIcon } from 'lucide-react'
import { Term } from '../components/atoms/Term'
import { PublicationBadge } from '../components/molecules/PublicationBadge'
import { ProvenancePanel } from '../components/organisms/indicators/ProvenancePanel'
import { pillarLabel } from '../data/pillars'
import { getIndicator } from '../services/public-api'
import { seo } from '../utils/seo'

/**
 * La fiche d'un indicateur : ce qu'il mesure, comment le lire, d'où il vient.
 * Ses valeurs se lisent sur la carte, où il est une couche parmi les autres.
 */
export const Route = createFileRoute('/indicators/$code')({
  loader: async ({ params }) => {
    const sheet = await getIndicator({ data: { code: params.code } })
    if (!sheet) throw notFound()
    return { sheet }
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
  const { sheet } = Route.useLoaderData()
  const [latest] = sheet.provenance

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-xs text-slate-500">
          {pillarLabel(sheet.pillar)} · source {latest.producer.acronym} ·{' '}
          {sheet.periods.join(', ')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {sheet.question ?? sheet.label}
        </h1>
        {sheet.question && (
          <p className="text-sm text-slate-500">{sheet.label}</p>
        )}
        <p className="text-sm text-slate-600">{sheet.unit}</p>
        <PublicationBadge status={latest.status} label={latest.statusLabel} />
      </header>

      <Link
        to="/carte"
        search={{ layer: sheet.code }}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
      >
        <MapIcon size={16} /> Voir sur la carte
      </Link>

      <section className="surface space-y-4 p-5">
        <h2 className="text-sm font-semibold">Comment lire ce chiffre</h2>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Term label="Définition">{sheet.definition}</Term>
          <Term label="Limites">{sheet.limits}</Term>
          <Term label="Champ">{sheet.scope}</Term>
          <Term label="Méthode">{sheet.method}</Term>
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">D’où viennent ces chiffres</h2>
        {sheet.provenance.map((p) => (
          <ProvenancePanel key={p.version.vintage} provenance={p} />
        ))}
      </section>
    </main>
  )
}
