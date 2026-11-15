import { createFileRoute, notFound } from '@tanstack/react-router'
import { IndicatorList } from '../components/organisms/indicators/IndicatorList'
import { PILLARS } from '../data/pillars'
import { listIndicators } from '../services/public-api'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/pillars/$pillar')({
  loader: async ({ params }) => {
    const pillar = PILLARS.find((p) => p.id === params.pillar)
    if (!pillar) throw notFound()
    return {
      pillar,
      indicators: (await listIndicators({ data: { pillar: pillar.id } })) ?? [],
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({
          title: loaderData.pillar.label,
          description: `Les indicateurs publics du pilier ${loaderData.pillar.label}, avec leur source.`,
        })
      : [],
  }),
  component: PillarPage,
})

function PillarPage() {
  const { pillar, indicators } = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{pillar.label}</h1>
      <IndicatorList indicators={indicators} />
    </main>
  )
}
