import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Section } from '../components/atoms/Section'
import { PillarGrid } from '../components/organisms/home/PillarGrid'
import { IndicatorList } from '../components/organisms/indicators/IndicatorList'
import { HOME } from '../data/home'
import { listIndicators } from '../services/public-api'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/')({
  loader: async () => ({
    indicators: (await listIndicators({ data: {} })) ?? [],
  }),
  head: () => ({ meta: seo({ title: 'Accueil', description: HOME.lead }) }),
  component: Home,
})

function Home() {
  const { indicators } = Route.useLoaderData()
  return (
    <>
      <Section className="bg-white">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            {HOME.title}
          </h1>
          <p className="text-lg leading-relaxed text-slate-600 text-pretty">
            {HOME.lead}
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            {HOME.principles.map((p) => (
              <li key={p} className="border-l-2 border-slate-900 pl-3">
                {p}
              </li>
            ))}
          </ul>
          <Link
            to="/carte"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            {HOME.explore} <ArrowRight size={15} />
          </Link>
        </div>
      </Section>
      <Section>
        <div id="piliers" className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Les douze piliers
          </h2>
          <PillarGrid indicators={indicators} />
        </div>
      </Section>
      <Section className="bg-white">
        <div id="indicateurs" className="space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Les indicateurs consultables
          </h2>
          <IndicatorList indicators={indicators} />
        </div>
      </Section>
    </>
  )
}
