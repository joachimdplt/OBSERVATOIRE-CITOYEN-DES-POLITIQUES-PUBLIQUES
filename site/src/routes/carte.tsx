import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { LayerPicker } from '../components/organisms/map/LayerPicker'
import { MapPanel } from '../components/organisms/map/MapPanel'
import { CommuneSearch } from '../components/molecules/CommuneSearch'
import { RegionSelect } from '../components/molecules/RegionSelect'
import { FRANCE } from '../data/regions'
import { TerritoryLayersCard } from '../components/organisms/territory/TerritoryLayersCard'
import {
  getIndicator,
  getTerritoryValues,
  listIndicators,
} from '../services/public-api'
import { seo } from '../utils/seo'

const search = z.object({
  layer: z.string().optional(),
  period: z.string().optional(),
  region: z.string().optional(),
  territory: z.string().optional(),
  level: z.string().optional(),
  name: z.string().optional(),
})

export const Route = createFileRoute('/carte')({
  validateSearch: search,
  loaderDeps: ({ search: s }) => ({
    layer: s.layer,
    territory: s.territory,
    level: s.level,
  }),
  loader: async ({ deps }) => {
    // Seules les couches de carte s'y choisissent ; la population par âge se
    // lit dans la fiche d'une commune.
    const layers = ((await listIndicators({ data: {} })) ?? []).filter(
      (l) => l.mapLayer,
    )
    const code =
      layers.find((l) => l.code === deps.layer)?.code ?? layers.at(0)?.code
    const sheet = code ? await getIndicator({ data: { code } }) : null
    const territory =
      deps.territory && deps.level
        ? await getTerritoryValues({
            data: { level: deps.level, code: deps.territory },
          })
        : null
    return { layers, sheet, territory }
  },
  head: () => ({
    meta: seo({
      title: 'Carte',
      description:
        'La France commune par commune : chaque donnée publiée est une couche, chaque commune a sa fiche.',
    }),
  }),
  component: MapPage,
})

function MapPage() {
  const { layers, sheet, territory } = Route.useLoaderData()
  const filters = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const keep = { replace: true, resetScroll: false } as const

  if (!sheet) {
    return (
      <p className="mx-auto max-w-5xl px-6 py-24 text-sm text-slate-500">
        Aucune donnée publiée pour l’instant.
      </p>
    )
  }
  const period =
    filters.period && sheet.periods.includes(filters.period)
      ? filters.period
      : sheet.periods.at(-1)!
  const regional = sheet.comparisonScale === 'regional'
  // La carte se lit une région à la fois ; un indicateur national peut aussi
  // se voir sur la France entière.
  const region =
    sheet.regions.some((r) => r.code === filters.region) ||
    (!regional && filters.region === FRANCE)
      ? filters.region
      : undefined

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-3">
        <p className="text-sm font-semibold">Les couches de la carte</p>
        <LayerPicker
          layers={layers}
          active={sheet.code}
          onPick={(layer) =>
            navigate({
              search: (s) => ({
                ...s,
                layer,
                period: undefined,
              }),
              ...keep,
            })
          }
        />
      </aside>
      <div className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {sheet.label}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{sheet.unit}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {sheet.provenance
                .map((p) => p.producer.acronym)
                .filter((a, i, all) => all.indexOf(a) === i)
                .join(', ')}
            </span>
          </p>
        </header>
        <MapPanel
          code={sheet.code}
          unit={sheet.unit}
          categories={sheet.kind === 'category' ? sheet.categories : null}
          scale={
            sheet.scaleLow && sheet.scaleHigh
              ? { low: sheet.scaleLow, high: sheet.scaleHigh }
              : null
          }
          periods={sheet.periods}
          period={period}
          region={region}
          regional={regional}
          waiting={!region}
          focus={filters.territory}
          toolbar={
            <>
              <CommuneSearch
                onPick={(t) =>
                  navigate({
                    search: (x) => ({
                      ...x,
                      region: t.regionCode ?? x.region,
                      territory: t.code,
                      level: t.level,
                      name: t.name,
                    }),
                    ...keep,
                  })
                }
              />
              <RegionSelect
                regions={sheet.regions}
                active={region}
                withFrance={!regional}
                onPick={(r) =>
                  // Une autre région ferme la fiche de la commune précédente.
                  navigate({
                    search: (x) => ({
                      ...x,
                      region: r,
                      territory: undefined,
                      level: undefined,
                      name: undefined,
                    }),
                    ...keep,
                  })
                }
              />
            </>
          }
          onPeriod={(p) =>
            navigate({ search: (s) => ({ ...s, period: p }), ...keep })
          }
          onSelect={(t) =>
            navigate({
              search: (s) => ({
                ...s,
                territory: t.code,
                level: t.level,
                name: t.name,
              }),
              ...keep,
            })
          }
          side={
            filters.territory ? (
              <TerritoryLayersCard
                data={territory}
                name={filters.name ?? filters.territory}
                onClose={() =>
                  navigate({
                    search: (s) => ({
                      ...s,
                      territory: undefined,
                      level: undefined,
                      name: undefined,
                    }),
                    ...keep,
                  })
                }
              />
            ) : (
              <p className="surface p-5 text-sm text-slate-600">
                Cliquez sur une commune pour lire toutes ses données.
              </p>
            )
          }
        />
      </div>
    </main>
  )
}
