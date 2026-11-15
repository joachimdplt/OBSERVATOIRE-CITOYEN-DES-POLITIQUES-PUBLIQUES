import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight, Download } from 'lucide-react'
import { useState } from 'react'
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

const isPdf = (url: string) => /\.pdf(\?|#|$)/i.test(url)

/** « LR_Produire_Plus_LIVRET.pdf » se lit « LR Produire Plus LIVRET ». */
const pdfName = (title: string) =>
  title.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
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
  // Ses programmes en document se téléchargent ; son site va dans la liste
  // de ses adresses, avec ses réseaux.
  const outline = c.programmeProfile?.outline ?? []
  const pdfs = outline
    .filter((d) => isPdf(d.url))
    .map((d) => ({ title: d.title, url: d.url, principal: d.principal }))
  if (
    c.programmeUrl &&
    isPdf(c.programmeUrl) &&
    !pdfs.some((d) => d.url === c.programmeUrl)
  )
    pdfs.unshift({ title: 'programme', url: c.programmeUrl, principal: true })
  // Le bouton télécharge le programme désigné comme principal, s'il est un
  // document ; les autres documents (livrets, textes plus anciens) vont
  // dans la liste.
  const main = pdfs.find((d) => d.principal)
  const others = pdfs.filter((d) => d !== main)
  const site =
    c.programmeUrl && !isPdf(c.programmeUrl)
      ? c.programmeUrl
      : (outline.find((d) => !isPdf(d.url))?.url ?? null)
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
              {main && (
                <a
                  href={main.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0B1A2A] px-5 text-[0.9rem] font-bold text-white no-underline hover:bg-[#1C2B3B]"
                >
                  <Download size={16} />
                  Télécharger le programme
                </a>
              )}
            </p>
            {c.programmeNote && (
              <p className={`mt-3 max-w-[62ch] text-[0.95rem] ${MUTED}`}>
                {c.programmeNote}
              </p>
            )}
            <Addresses
              rows={[
                ...(site
                  ? [
                      {
                        label: 'Site',
                        value: new URL(site).hostname.replace(/^www\./, ''),
                        href: site,
                      },
                    ]
                  : []),
                ...c.accounts.map((a) => ({
                  label: NETWORKS[a.network],
                  value: a.network === 'youtube' ? 'Sa chaîne' : `@${a.handle}`,
                  href: a.url,
                  hint: `D’après Wikidata (${a.source.replace('https://www.wikidata.org/wiki/', '')})`,
                })),
              ]}
              more={[
                ...others.map((d) => ({
                  label: 'Document',
                  value: pdfName(d.title),
                  href: d.url,
                  download: true,
                })),
              ]}
            />
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
      <NoProgramme candidate={c} />
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

/** Aucun programme collecté : dit tel quel, avec la date du constat. */
function NoProgramme({ candidate: c }: { candidate: CandidateSheet }) {
  if (c.programme.passages > 0) return null
  return (
    <section className="px-6 py-12 md:px-10">
      <p className={`mx-auto max-w-[1120px] ${MUTED}`}>
        Aucun programme collecté
        {c.programmeCheckedAt ? ` au ${frenchDate(c.programmeCheckedAt)}` : ''}.
      </p>
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

type Address = {
  label: string
  value: string
  href: string
  download?: boolean
  hint?: string
}

/**
 * Ses adresses, une par ligne : son site et tous ses réseaux d'abord ; ses
 * autres documents s'ouvrent avec « Voir plus », pour que le bloc ne
 * dépasse pas la photo.
 */
function Addresses({ rows, more }: { rows: Address[]; more: Address[] }) {
  const [open, setOpen] = useState(false)
  if (rows.length + more.length === 0) return null
  const shown = open ? [...rows, ...more] : rows
  return (
    <div className="mt-6 max-w-[520px]">
      <ul className="divide-y divide-[#0B1A2A]/8 overflow-hidden rounded-[18px] bg-white">
        {shown.map((r) => (
          <li key={r.href}>
            <a
              href={r.href}
              target="_blank"
              rel="noreferrer"
              title={r.hint}
              className="flex items-center gap-4 px-4 py-2.5 text-[0.9rem] no-underline hover:bg-[#F4F6F8]"
            >
              <span className="w-[90px] shrink-0 font-bold text-[#0B1A2A]">
                {r.label}
              </span>
              <span className={`flex-1 truncate font-semibold ${MUTED}`}>
                {r.value}
              </span>
              {r.download ? (
                <Download size={14} className="shrink-0 text-[#0B1A2A]" />
              ) : (
                <ArrowUpRight size={14} className="shrink-0 text-[#0B1A2A]" />
              )}
            </a>
          </li>
        ))}
      </ul>
      {more.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 px-4 text-[0.88rem] font-bold text-[#0B1A2A] hover:underline"
        >
          {open ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </div>
  )
}
