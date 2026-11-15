import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { CandidatePortrait } from '../components/molecules/CandidatePortrait'
import { LiveBadge } from '../components/molecules/LiveBadge'
import { Carousel } from '../components/molecules/Carousel'
import { VideoEmbed } from '../components/molecules/VideoEmbed'
import { CandidateApproach } from '../components/organisms/candidates/CandidateApproach'
import { CandidateProgramme } from '../components/organisms/candidates/CandidateProgramme'
import { getCandidate, getCandidateProgramme } from '../services/public-api'
import type { CandidateSheet } from '../types/public'
import { frenchDate } from '../utils/date'
import { seo } from '../utils/seo'

const ELECTION = 'presidentielle-2027'

export const Route = createFileRoute('/candidats/$slug')({
  loader: async ({ params }) => {
    const [candidate, programme] = await Promise.all([
      getCandidate({ data: { election: ELECTION, slug: params.slug } }),
      getCandidateProgramme({
        data: { election: ELECTION, slug: params.slug },
      }).catch(() => null),
    ])
    if (!candidate) throw notFound()
    return { ...candidate, programmeProfile: programme }
  },
  head: ({ loaderData }) => ({
    meta: seo({
      title: loaderData?.name ?? 'Candidat',
      description: loaderData
        ? `${loaderData.name}, candidat à l’${loaderData.election.name.toLowerCase()} : déclaration, programme, sujets abordés et vidéos publiques, avec leurs sources.`
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

const NETWORKS = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
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
      <section className="px-6 pt-20 pb-6 md:px-10">
        <div className="mx-auto grid max-w-[1120px] gap-8 md:grid-cols-[300px_minmax(0,1fr)] md:items-stretch">
          <CandidatePortrait
            name={c.name}
            photo={c.photo}
            fill
            className="w-[180px] md:w-full"
          />
          <div>
            <p
              className={`flex flex-wrap items-center gap-3 text-sm font-semibold ${MUTED}`}
            >
              {c.election.name}
              <LiveBadge />
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
            {c.accounts.length > 0 && (
              <p className="mt-5 flex flex-wrap items-center gap-2">
                {c.accounts.map((a) => (
                  <a
                    key={`${a.network}-${a.handle}`}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    title={`D’après Wikidata (${a.source.replace('https://www.wikidata.org/wiki/', '')})`}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-[0.88rem] font-bold text-[#0B1A2A] no-underline hover:bg-[#E8ECF0]"
                  >
                    {NETWORKS[a.network]}
                    {a.network !== 'youtube' && (
                      <span className={`font-semibold ${MUTED}`}>
                        @{a.handle}
                      </span>
                    )}
                    <ArrowUpRight size={13} />
                  </a>
                ))}
              </p>
            )}
          </div>
        </div>
      </section>

      <Videos candidate={c} />
      {c.programmeProfile && (
        <CandidateApproach approach={c.programmeProfile.approach} />
      )}
      {c.programmeProfile && (
        <CandidateProgramme
          programme={c.programmeProfile}
          election={ELECTION}
          candidate={c.slug}
        />
      )}
      <Topics candidate={c} />
      <section className="px-6 pb-16 md:px-10">
        <div className="mx-auto max-w-[1120px]">
          <div>
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
    </main>
  )
}

function Topics({ candidate: c }: { candidate: CandidateSheet }) {
  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1120px]">
        <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
          Les sujets de son programme
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
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {c.topics.map((t) => (
                <li key={t.slug}>
                  <Link
                    to="/sujets/$slug"
                    params={{ slug: t.slug }}
                    hash={`candidat-${c.slug}`}
                    hashScrollIntoView={false}
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
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1120px]">
        <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
          Vidéos publiques
        </h2>
        <p className={`mt-4 max-w-[64ch] leading-relaxed ${MUTED}`}>
          Le candidat, dans ses propres mots : ses vidéos, celles de son parti
          et ses interventions à l’Assemblée et au Sénat.
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
          <div className="mt-6">
            <Carousel>
              {c.videos.map((v) => (
                <div key={v.url} className="h-full rounded-[22px] bg-white p-3">
                  <VideoEmbed
                    url={v.url}
                    title={v.title}
                    thumbnail={v.thumbnail}
                  />
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block px-1 leading-snug font-bold text-[#0B1A2A] no-underline hover:underline"
                  >
                    {v.title}
                  </a>
                  <p className={`mt-1 px-1 text-[0.82rem] ${MUTED}`}>
                    {frenchDate(v.publishedAt)} · {v.channel.name} ·{' '}
                    {LINK[v.link]}
                  </p>
                </div>
              ))}
            </Carousel>
          </div>
        )}
      </div>
    </section>
  )
}
