import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { CandidatePortrait } from '../components/molecules/CandidatePortrait'
import { getCandidate } from '../services/public-api'
import type { CandidateSheet } from '../types/public'
import { frenchDate } from '../utils/date'
import { seo } from '../utils/seo'

const ELECTION = 'presidentielle-2027'

export const Route = createFileRoute('/candidats/$slug')({
  loader: async ({ params }) => {
    const candidate = await getCandidate({
      data: { election: ELECTION, slug: params.slug },
    })
    if (!candidate) throw notFound()
    return candidate
  },
  head: ({ loaderData }) => ({
    meta: seo({
      title: loaderData?.name ?? 'Candidat',
      description: loaderData
        ? `${loaderData.name}, candidat à l’${loaderData.election.name.toLowerCase()} : déclaration, programme, enjeux abordés et vidéos publiques, avec leurs sources.`
        : '',
    }),
  }),
  component: CandidatePage,
})

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

const STATUS = {
  complete: 'Programme complet',
  partial: 'Documents partiels',
  none: 'Rien de publié',
} as const

const LINK = {
  own_channel: 'sa chaîne',
  name_in_title: 'nommé dans le titre',
} as const

/**
 * La page d'un candidat : sa déclaration et sa source, l'état de son
 * programme, les enjeux dont ce programme parle, puis ses vidéos publiques
 * venues des seules sources primaires.
 */
function CandidatePage() {
  const c = Route.useLoaderData()
  return (
    <main>
      <section className="bg-white px-6 pt-20 pb-14 md:px-10">
        <div className="mx-auto grid max-w-[920px] gap-8 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
          <CandidatePortrait
            name={c.name}
            photo={c.photo}
            className="w-[180px] md:w-full"
          />
          <div>
            <p className={`text-sm font-semibold ${MUTED}`}>
              {c.election.name}
            </p>
            <h1
              className={`${DISPLAY} mt-3 text-[clamp(2.4rem,6vw,4rem)] leading-[1.05]`}
            >
              {c.name}
            </h1>
            <p className={`mt-5 text-[1.1rem] ${MUTED}`}>
              {c.party ?? 'Sans étiquette'} · candidature déclarée le{' '}
              <a
                href={c.declarationSource}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-[#0B1A2A]/25 underline-offset-2 hover:decoration-[#0B1A2A]"
              >
                {frenchDate(c.declaredAt)}
              </a>
            </p>
            <p className="mt-6 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex h-8 items-center rounded-full px-4 text-sm font-bold ${
                  c.programmeStatus === 'complete'
                    ? 'bg-[#0B1A2A] text-white'
                    : 'text-[#0B1A2A] ring-1 ring-[#0B1A2A]/25'
                }`}
              >
                {STATUS[c.programmeStatus]}
              </span>
              {c.programmeUrl && (
                <a
                  href={c.programmeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#0B1A2A] no-underline hover:underline"
                >
                  Lire le programme <ArrowUpRight size={15} />
                </a>
              )}
            </p>
            {c.programmeNote && (
              <p className={`mt-3 max-w-[62ch] text-[0.95rem] ${MUTED}`}>
                {c.programmeNote}
                {c.programmeCheckedAt
                  ? ` État constaté le ${frenchDate(c.programmeCheckedAt)}.`
                  : ''}
              </p>
            )}
          </div>
        </div>
      </section>

      <Topics candidate={c} />
      <Videos candidate={c} />
    </main>
  )
}

function Topics({ candidate: c }: { candidate: CandidateSheet }) {
  return (
    <section className="bg-[#F4F6F8] px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[920px]">
        <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
          Les enjeux dans son programme
        </h2>
        {c.programme.passages === 0 ? (
          <p className={`mt-4 ${MUTED}`}>
            Aucun programme collecté
            {c.programmeCheckedAt
              ? ` au ${frenchDate(c.programmeCheckedAt)}`
              : ''}
            .
          </p>
        ) : (
          <>
            <p className={`mt-4 max-w-[64ch] leading-relaxed ${MUTED}`}>
              {c.programme.passages} passages lus dans {c.programme.documents}{' '}
              {c.programme.documents > 1 ? 'documents' : 'document'}. Chaque
              enjeu compte les passages qui contiennent l’un de ses termes ; la
              page de l’enjeu les cite mot pour mot, à côté des autres
              programmes.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {c.topics.map((t) => (
                <li key={t.slug}>
                  <Link
                    to="/enjeux/$slug"
                    params={{ slug: t.slug }}
                    className="group flex items-center justify-between gap-4 rounded-[20px] bg-white px-5 py-4 no-underline"
                  >
                    <span className="font-bold text-[#0B1A2A] group-hover:underline">
                      {t.name}
                    </span>
                    <span className={`shrink-0 text-sm tabular-nums ${MUTED}`}>
                      {t.passages} passage{t.passages > 1 ? 's' : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function Videos({ candidate: c }: { candidate: CandidateSheet }) {
  return (
    <section className="bg-white px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[920px]">
        <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
          Vidéos publiques
        </h2>
        <p className={`mt-4 max-w-[64ch] leading-relaxed ${MUTED}`}>
          Seulement des sources primaires : sa propre chaîne, celle de son parti
          (les vidéos qui le nomment), et les chaînes de l’Assemblée nationale
          et du Sénat. Chaque chaîne est celle que donne un site officiel. Aucun
          reportage, aucun commentaire d’un tiers.
        </p>
        {c.channels.length > 0 && (
          <p className={`mt-3 text-[0.9rem] ${MUTED}`}>
            {c.channels.map((ch, i) => (
              <span key={ch.url}>
                {i > 0 ? ' · ' : ''}
                <a
                  href={ch.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#0B1A2A] no-underline hover:underline"
                >
                  {ch.name}
                </a>{' '}
                (lien donné par{' '}
                <a
                  href={ch.linkedFrom}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[#0B1A2A]/25 underline-offset-2"
                >
                  {new URL(ch.linkedFrom).hostname.replace(/^www\./, '')}
                </a>
                )
              </span>
            ))}
          </p>
        )}
        {c.videos.length === 0 ? (
          <p className={`mt-8 ${MUTED}`}>
            {c.channels.length === 0
              ? 'Aucune chaîne vidéo liée depuis son site ou celui de son parti, et aucune vidéo de l’Assemblée ou du Sénat qui le nomme.'
              : 'Aucune vidéo collectée pour l’instant.'}
          </p>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {c.videos.map((v) => (
              <li key={v.url}>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block no-underline"
                >
                  {v.thumbnail && (
                    <img
                      src={v.thumbnail}
                      alt=""
                      loading="lazy"
                      className="aspect-video w-full rounded-[16px] bg-[#F4F6F8] object-cover"
                    />
                  )}
                  <p className="mt-3 leading-snug font-bold text-[#0B1A2A] group-hover:underline">
                    {v.title}
                  </p>
                  <p className={`mt-1 text-[0.82rem] ${MUTED}`}>
                    {frenchDate(v.publishedAt)} · {v.channel.name} ·{' '}
                    {LINK[v.link]}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-12">
          <Link
            to="/"
            hash="candidats"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1A2A] px-6 font-extrabold text-white no-underline hover:opacity-90"
          >
            Tous les candidats <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  )
}
