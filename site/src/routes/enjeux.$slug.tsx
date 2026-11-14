import {
  Link,
  createFileRoute,
  notFound,
  useNavigate,
} from '@tanstack/react-router'
import { ArrowRight, Map as MapIcon, X } from 'lucide-react'
import { z } from 'zod'
import { CommuneSearch } from '../components/molecules/CommuneSearch'
import { ValueCell } from '../components/organisms/indicators/ValueCell'
import { MeasureComparison } from '../components/organisms/publications/MeasureComparison'
import { MeasureList } from '../components/organisms/publications/MeasureList'
import { CollectedTexts } from '../components/organisms/publications/CollectedTexts'
import { ProgrammePassages } from '../components/organisms/publications/ProgrammePassages'
import { pillarLabel } from '../data/pillars'
import {
  getPublication,
  getTerritoryValues,
  getTopic,
} from '../services/public-api'
import type { TerritoryLayer, TopicSheet } from '../types/public'
import { frenchDate } from '../utils/date'
import { approximately, frenchNumber } from '../utils/number'
import { seo } from '../utils/seo'

const search = z.object({
  territory: z.string().optional(),
  level: z.string().optional(),
  name: z.string().optional(),
})

export const Route = createFileRoute('/enjeux/$slug')({
  validateSearch: search,
  loaderDeps: ({ search: s }) => ({ territory: s.territory, level: s.level }),
  loader: async ({ params, deps }) => {
    const [publication, topic] = await Promise.all([
      getPublication({ data: { slug: params.slug } }),
      getTopic({ data: { slug: params.slug } }).catch(() => null),
    ])
    if (!publication && !topic) throw notFound()
    const territory =
      publication && deps.territory && deps.level
        ? await getTerritoryValues({
            data: { level: deps.level, code: deps.territory },
          })
        : null
    return { publication, topic, territory }
  },
  head: ({ loaderData }) => ({
    meta: seo({
      title:
        loaderData?.publication?.title ?? loaderData?.topic?.name ?? 'Enjeu',
      description:
        loaderData?.publication?.summary ??
        (loaderData?.topic
          ? `${loaderData.topic.name} dans les programmes des candidats à la présidentielle 2027, cité mot pour mot.`
          : ''),
    }),
  }),
  component: PublicationPage,
})

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

/**
 * Une publication de l'observatoire : un enjeu, ses maillons, et pour chacun
 * les indicateurs choisis avec la raison de leur choix. Une commune choisie,
 * chaque indicateur donne sa valeur pour elle, ou pour son département quand
 * la source ne descend pas plus bas.
 */
function PublicationPage() {
  const { publication, topic } = Route.useLoaderData()
  if (!publication) return topic ? <TopicOnly topic={topic} /> : null
  return <PublicationView topic={topic} />
}

/**
 * Un enjeu sans article : son nom et son pilier, puis les passages des
 * programmes. L'article viendra avec les indicateurs.
 */
function TopicOnly({ topic }: { topic: TopicSheet }) {
  return (
    <main>
      <section className="bg-white px-6 pt-20 pb-6 md:px-10">
        <div className="mx-auto max-w-[920px]">
          <p className={`text-sm font-semibold ${MUTED}`}>
            {pillarLabel(topic.pillar)}
          </p>
          <h1
            className={`${DISPLAY} mt-3 text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.08]`}
          >
            {topic.name}
          </h1>
          <p
            className={`mt-6 max-w-[62ch] text-[1.05rem] leading-relaxed ${MUTED}`}
          >
            Pas encore d’article de l’observatoire sur cet enjeu : ni
            indicateurs choisis, ni relecture. Les passages des programmes
            publiés suivent.
          </p>
        </div>
      </section>
      <ProgrammePassages topic={topic} />
      <section className="bg-white px-6 pb-16 md:px-10">
        <div className="mx-auto max-w-[920px]">
          <Link
            to="/enjeux"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1A2A] px-6 font-extrabold text-white no-underline hover:opacity-90"
          >
            Tous les enjeux <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  )
}

function PublicationView({ topic }: { topic: TopicSheet | null }) {
  const { publication, territory } = Route.useLoaderData()
  const p = publication!
  const filters = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const layerOf = (code: string): TerritoryLayer | undefined =>
    territory?.layers.find((l) => l.indicator.code === code)

  return (
    <main>
      <section className="bg-white px-6 pt-20 pb-14 md:px-10">
        <div className="mx-auto max-w-[920px]">
          <p className={`text-sm font-semibold ${MUTED}`}>
            {pillarLabel(p.pillar)}
          </p>
          <h1
            className={`${DISPLAY} mt-3 text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.08]`}
          >
            {p.title}
          </h1>
          <p
            className={`mt-6 max-w-[62ch] text-[1.15rem] leading-relaxed ${MUTED}`}
          >
            {p.summary}
          </p>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#5B6470]">
            <span
              className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-bold ${
                p.status === 'published'
                  ? 'bg-[#0B1A2A] text-white'
                  : 'text-[#0B1A2A] ring-1 ring-[#0B1A2A]/20'
              }`}
            >
              {p.statusLabel}
            </span>
            <span>
              Version {p.number}
              {p.publishedAt
                ? ` du ${frenchDate(p.publishedAt.slice(0, 10))}`
                : ''}
            </span>
            {p.authoredBy && <span>· par {p.authoredBy}</span>}
            {p.reviewedBy && <span>· relue par {p.reviewedBy}</span>}
          </p>
        </div>
      </section>

      <section className="sticky top-14 z-[5] border-y border-[#0B1A2A]/10 bg-white/90 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-[920px] flex-wrap items-center gap-3">
          <CommuneSearch
            onPick={(t) =>
              navigate({
                search: { territory: t.code, level: t.level, name: t.name },
                replace: true,
                resetScroll: false,
              })
            }
          />
          {filters.territory ? (
            <span className="inline-flex h-9 items-center gap-2 rounded-full bg-[#0B1A2A] pr-2 pl-4 text-sm font-bold text-white">
              {territory?.territory.name ?? filters.name}
              <button
                type="button"
                aria-label="Retirer la commune"
                onClick={() =>
                  navigate({ search: {}, replace: true, resetScroll: false })
                }
                className="flex size-6 items-center justify-center rounded-full hover:bg-white/15"
              >
                <X size={14} />
              </button>
            </span>
          ) : (
            <span className={`text-sm ${MUTED}`}>
              Choisissez une commune pour lire ses chiffres.
            </span>
          )}
        </div>
      </section>

      <MeasureComparison sections={p.sections} collected={p.collected} />

      <section className="bg-[#F4F6F8] px-6 py-16 md:px-10">
        <ol className="mx-auto max-w-[920px] space-y-8">
          {p.sections.map((section, i) => (
            <li
              key={section.title}
              className="rounded-[28px] bg-white p-6 shadow-[0_0_0_1px_rgba(11,26,42,0.08)] md:p-10"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0B1A2A] text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <div>
                  <h2 className={`${DISPLAY} text-[1.6rem] leading-tight`}>
                    {section.title}
                  </h2>
                  <p
                    className={`mt-3 max-w-[62ch] text-[1.02rem] leading-relaxed ${MUTED}`}
                  >
                    {section.text}
                  </p>
                </div>
              </div>
              <ul className="mt-8 divide-y divide-[#0B1A2A]/8">
                {section.indicators.map((indicator, k) => {
                  const layer = layerOf(indicator.code)
                  // Une justification répétée ne s'écrit qu'une fois.
                  const repeated =
                    k > 0 &&
                    section.indicators[k - 1].justification ===
                      indicator.justification
                  const value = layer?.values.at(-1)
                  return (
                    <li
                      key={indicator.code}
                      className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline md:gap-8"
                    >
                      <div className="space-y-1">
                        <Link
                          to="/indicators/$code"
                          params={{ code: indicator.code }}
                          className="font-bold text-[#0B1A2A] no-underline hover:underline"
                        >
                          {indicator.label}
                        </Link>
                        {!repeated && (
                          <p className={`text-[0.88rem] ${MUTED}`}>
                            {indicator.justification}
                          </p>
                        )}
                        {indicator.mapLayer && (
                          <Link
                            to="/carte"
                            search={{ layer: indicator.code }}
                            className="inline-flex items-center gap-1.5 text-[0.85rem] font-bold text-[#0B1A2A] no-underline hover:underline"
                          >
                            <MapIcon size={14} /> Sur la carte
                          </Link>
                        )}
                      </div>
                      {filters.territory && (
                        <div className="text-left md:text-right">
                          {layer && value ? (
                            <>
                              <p className="text-[1.15rem] font-extrabold text-[#0B1A2A] tabular-nums">
                                {value.value !== null &&
                                value.status === 'documented' &&
                                approximately(value.value) !==
                                  frenchNumber(value.value) ? (
                                  <>
                                    <span className="mr-1 text-[0.75rem] font-normal text-[#5B6470]">
                                      {frenchNumber(value.value)}
                                    </span>
                                    ≈ {approximately(value.value)}
                                  </>
                                ) : (
                                  <ValueCell
                                    observation={value}
                                    categories={layer.indicator.categories}
                                  />
                                )}{' '}
                                {indicator.kind === 'number' && (
                                  <span className="text-[0.8rem] font-semibold text-[#5B6470]">
                                    {indicator.unit}
                                  </span>
                                )}
                              </p>
                              <p className={`text-[0.8rem] ${MUTED}`}>
                                {value.period}
                                {layer.scope.level === 'department'
                                  ? ` · département : ${layer.scope.name}`
                                  : ''}{' '}
                                · {layer.indicator.producer}
                              </p>
                            </>
                          ) : (
                            <p className={`text-[0.9rem] ${MUTED}`}>
                              non documenté
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              <MeasureList measures={section.measures} />
            </li>
          ))}
        </ol>
        <CollectedTexts texts={p.collected} />
        {p.history.length > 0 && (
          <div className={`mx-auto mt-10 max-w-[920px] text-sm ${MUTED}`}>
            Versions précédentes :{' '}
            {p.history
              .map(
                (h) =>
                  `n° ${h.number}${h.publishedAt ? ` du ${frenchDate(h.publishedAt.slice(0, 10))}` : ''}`,
              )
              .join(', ')}
          </div>
        )}
        <div className="mx-auto mt-10 flex max-w-[920px]">
          <Link
            to="/carte"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1A2A] px-6 font-extrabold text-white no-underline hover:opacity-90"
          >
            Ouvrir la carte <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      {topic && <ProgrammePassages topic={topic} />}
    </main>
  )
}
