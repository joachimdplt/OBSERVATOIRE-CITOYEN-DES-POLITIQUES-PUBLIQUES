import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Section } from '../components/atoms/Section'
import { HOME } from '../data/home'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/')({
  head: () => ({ meta: seo({ title: 'Accueil', description: HOME.lead }) }),
  component: Home,
})

/**
 * L'accueil dit ce que fait l'observatoire et comment y contribuer, un écran
 * par idée : la promesse, le chemin d'un chiffre, les règles, la contribution.
 */
function Home() {
  return (
    <>
      <Section className="bg-white">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            {HOME.title}
          </h1>
          <p className="text-lg leading-relaxed text-pretty text-slate-600">
            {HOME.lead}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/carte"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
            >
              {HOME.explore} <ArrowRight size={15} />
            </Link>
            <a
              href="#contribuer"
              className="inline-flex h-11 items-center rounded-full px-5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {HOME.contribute}
            </a>
          </div>
        </div>
      </Section>

      <Section>
        <div className="space-y-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {HOME.steps.title}
          </h2>
          <ol className="grid gap-6 sm:grid-cols-2">
            {HOME.steps.items.map((step, i) => (
              <li key={step.title} className="surface space-y-3 p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
                  {i + 1}
                </span>
                <p className="text-lg font-semibold">{step.title}</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section className="bg-white">
        <div className="max-w-3xl space-y-10">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {HOME.rules.title}
          </h2>
          <ul className="space-y-5">
            {HOME.rules.items.map((rule) => (
              <li
                key={rule}
                className="border-l-2 border-slate-900 pl-4 text-lg leading-relaxed text-slate-800"
              >
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section>
        <div id="contribuer" className="scroll-mt-20 space-y-10">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {HOME.contribution.title}
            </h2>
            <p className="text-lg leading-relaxed text-pretty text-slate-600">
              {HOME.contribution.lead}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {HOME.contribution.ways.map((way) => (
              <div
                key={way.title}
                className="surface flex flex-col justify-between gap-6 p-6"
              >
                <div className="space-y-3">
                  <p className="text-lg font-semibold">{way.title}</p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {way.text}
                  </p>
                </div>
                <a
                  href={way.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {way.action} <ArrowUpRight size={15} />
                </a>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500">{HOME.contribution.license}</p>
        </div>
      </Section>
    </>
  )
}
