import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { getProgrammePassages } from '../../../services/public-api'
import type { CandidateProgramme as Programme } from '../../../types/public'
import { QuoteText } from '../../molecules/QuoteText'
import { documentLabel } from './CandidateSubjects'

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

const isPdf = (url: string) => /\.pdf(\?|#|$)/i.test(url)

type Chapter = Programme['chapters'][number]
type Group = { title: string; url: string; site: boolean; chapters: Chapter[] }

/**
 * Ses textes en entier, rangés sobrement : une carte par document (toutes
 * les pages de son site dans une seule), et dans chaque carte la liste de
 * ses chapitres, à ses propres titres. Un chapitre s'ouvre au clic sur ses
 * passages, cités mot pour mot ; rien ne se charge avant.
 */
export function CandidateDocuments({
  programme: p,
  election,
  candidate,
}: {
  programme: Programme
  election: string
  candidate: string
}) {
  if (p.chapters.length === 0) return null
  const groups: Group[] = []
  const site = (url: string) => new URL(url).hostname.replace(/^www\./, '')
  p.outline.forEach((d, i) => {
    const chapters = p.chapters.filter((c) => c.document === i)
    if (chapters.length === 0) return
    if (isPdf(d.url))
      groups.push({ title: d.title, url: d.url, site: false, chapters })
    else {
      const own = groups.find((g) => g.site && site(g.url) === site(d.url))
      if (own) own.chapters.push(...chapters)
      else groups.push({ title: site(d.url), url: d.url, site: true, chapters })
    }
  })
  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1120px] space-y-5">
        <div>
          <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
            Ses documents
          </h2>
        </div>
        {groups.map((g) => (
          <DocumentCard
            key={g.url}
            group={g}
            election={election}
            candidate={candidate}
          />
        ))}
      </div>
    </section>
  )
}

function DocumentCard({
  group: g,
  election,
  candidate,
}: {
  group: Group
  election: string
  candidate: string
}) {
  return (
    <article className="glass rounded-[28px] p-2">
      <header className="px-4 pt-3 pb-2">
        <a
          href={g.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-left text-lg font-extrabold tracking-tight text-[#0B1A2A] no-underline hover:underline"
        >
          {g.site ? g.title : documentLabel(g.title, g.url)}
          <ArrowUpRight size={16} className={MUTED} />
        </a>
      </header>
      <ul className="divide-y divide-white/70">
        {g.chapters.map((c) => (
          <ChapterRow
            key={`${c.document}-${c.start}`}
            chapter={c}
            election={election}
            candidate={candidate}
          />
        ))}
      </ul>
    </article>
  )
}

function ChapterRow({
  chapter: c,
  election,
  candidate,
}: {
  chapter: Chapter
  election: string
  candidate: string
}) {
  const [open, setOpen] = useState(false)
  const [passages, setPassages] = useState<Programme['passages'] | null>(null)
  const toggle = () => {
    setOpen(!open)
    if (passages) return
    getProgrammePassages({
      data: { election, slug: candidate, start: c.start, count: c.count },
    })
      .then((r) => setPassages(r?.passages ?? []))
      .catch(() => setPassages([]))
  }
  const pages =
    c.from === null
      ? ''
      : c.from === c.to
        ? `p. ${c.from}`
        : `p. ${c.from} à ${c.to}`
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left transition-colors hover:bg-white/50"
      >
        <span className="flex-1 font-semibold text-[#0B1A2A]">{c.label}</span>
        {pages && (
          <span className={`shrink-0 text-xs ${MUTED} tabular-nums`}>
            {pages}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`shrink-0 ${MUTED} transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="subject-enter space-y-3 px-4 pb-4">
          {passages === null ? (
            <p className={`text-left text-sm ${MUTED}`}>Chargement…</p>
          ) : (
            passages.map((x, i) => (
              <div key={i} className="glass-text">
                <QuoteText text={x.quote} />
                {x.page !== null && (
                  <p className={`mt-2 text-left text-xs ${MUTED}`}>
                    p. {x.page}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </li>
  )
}
