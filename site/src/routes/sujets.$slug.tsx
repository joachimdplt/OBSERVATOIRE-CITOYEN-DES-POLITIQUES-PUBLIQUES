import {
  Link,
  createFileRoute,
  notFound,
  useNavigate,
  redirect,
} from '@tanstack/react-router'
import { ArrowRight, Map as MapIcon, X } from 'lucide-react'
import { z } from 'zod'
import { CommuneSearch } from '../components/molecules/CommuneSearch'
import { ValueCell } from '../components/organisms/indicators/ValueCell'
import { ParliamentBlock } from '../components/organisms/publications/ParliamentBlock'
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

export const Route = createFileRoute('/sujets/$slug')({
  // Mis de côté pour l'instant : la page reste dans le code (branche
  // articles-carte) mais n'est plus ouverte au public.
  beforeLoad: () => {
    throw redirect({ to: '/', statusCode: 302 })
  },
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
        loaderData?.publication?.title ?? loaderData?.topic?.name ?? 'Sujet',
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
  const speaking = topic.candidates.filter((c) => c.passages.length > 0)
  const passages = speaking.reduce((n, c) => n + c.passages.length, 0)
  const complete = speaking.filter(
    (c) => c.programmeStatus === 'complete',
  ).length
  const partial = speaking.length - complete
  const silent = topic.candidates.length - speaking.length
  const leader = [...speaking]
    .sort((a, b) => b.passages.length - a.passages.length)
    .at(0)
  const lastRead = speaking
    .flatMap((c) => c.passages.map((p) => p.document.fetchedAt))
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1)
  const quoted = topic.terms.map((t) => `« ${t} »`)
  const terms =
    quoted.length > 1
      ? `${quoted.slice(0, -1).join(', ')} ou ${quoted.at(-1)}`
      : quoted[0]
  return (
    <main>
      <section className="px-6 pt-10 md:px-10">
        <div className="mx-auto max-w-[1280px] rounded-[36px] bg-white p-6 md:p-10">
          <div>
            <p className={`text-sm font-semibold ${MUTED}`}>
              {pillarLabel(topic.pillar)}
            </p>
            <h1
              className={`${DISPLAY} mt-3 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.06]`}
            >
              {topic.name}
            </h1>
            <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-3">
              <div>
                <dt className={`text-[0.85rem] ${MUTED}`}>Passages</dt>
                <dd className="mt-1 text-[2.4rem] leading-none font-extrabold text-[#0B1A2A] tabular-nums">
                  {passages}
                </dd>
                <dd className={`mt-2 text-[0.85rem] leading-snug ${MUTED}`}>
                  contenant {terms}
                </dd>
              </div>
              <div>
                <dt className={`text-[0.85rem] ${MUTED}`}>Programmes</dt>
                <dd className="mt-1 text-[2.4rem] leading-none font-extrabold text-[#0B1A2A] tabular-nums">
                  {speaking.length}
                  <span className="text-[1.2rem] text-[#0B1A2A]/40">
                    {' '}
                    sur {topic.candidates.length}
                  </span>
                </dd>
                <dd className={`mt-2 text-[0.85rem] leading-snug ${MUTED}`}>
                  en parlent : {complete} complet{complete > 1 ? 's' : ''},{' '}
                  {partial} partiel{partial > 1 ? 's' : ''}
                  {silent > 0
                    ? ` ; ${silent} n’en parle${silent > 1 ? 'nt' : ''} pas avec ces termes`
                    : ''}
                </dd>
              </div>
              {leader && (
                <div>
                  <dt className={`text-[0.85rem] ${MUTED}`}>
                    En parle le plus
                  </dt>
                  <dd className="mt-1 text-[2.4rem] leading-none font-extrabold text-[#0B1A2A] tabular-nums">
                    {leader.passages.length}
                  </dd>
                  <dd className={`mt-2 text-[0.85rem] leading-snug ${MUTED}`}>
                    passages de {leader.name}
                    {lastRead ? `, lus le ${frenchDate(lastRead)}` : ''}
                  </dd>
                </div>
              )}
            </dl>
            <p
              className={`mt-6 max-w-[48ch] text-[0.92rem] leading-relaxed ${MUTED}`}
            >
              Pas encore d’article de l’observatoire sur ce sujet : ni
              indicateurs officiels choisis, ni relecture.
            </p>
          </div>
        </div>
      </section>
      <ProgrammePassages topic={topic} />
      <section className="px-6 pb-16 md:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Link
            to="/sujets"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1A2A] px-6 font-extrabold text-white no-underline hover:opacity-90"
          >
            Tous les sujets <ArrowRight size={17} />
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
      <section className="px-6 pt-20 pb-14 md:px-10">
        <div className="mx-auto max-w-[1120px]">
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

      {topic && <ProgrammePassages topic={topic} />}

      <section className="px-6 pt-8 md:px-10">
        <div className="mx-auto max-w-[1120px]">
          <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
            Les chiffres officiels
          </h2>
        </div>
      </section>

      <section className="sticky top-[86px] z-[5] border-y border-[#0B1A2A]/8 bg-[#F4F6F8]/90 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-3">
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

      <section className="px-6 py-16 md:px-10">
        <ol className="mx-auto max-w-[1120px] space-y-8">
          {p.sections.map((section, i) => (
            <li
              key={section.title}
              className="rounded-[28px] glass p-6 md:p-10"
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
            </li>
          ))}
        </ol>
        {p.history.length > 0 && (
          <div className={`mx-auto mt-10 max-w-[1120px] text-sm ${MUTED}`}>
            Versions précédentes :{' '}
            {p.history
              .map(
                (h) =>
                  `n° ${h.number}${h.publishedAt ? ` du ${frenchDate(h.publishedAt.slice(0, 10))}` : ''}`,
              )
              .join(', ')}
          </div>
        )}
        <div className="mx-auto mt-10 flex max-w-[1120px]">
          <Link
            to="/carte"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1A2A] px-6 font-extrabold text-white no-underline hover:opacity-90"
          >
            Ouvrir la carte <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <ParliamentBlock article={p} />
    </main>
  )
}
