import { Link } from '@tanstack/react-router'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { CandidateProgramme as Programme } from '../../../types/public'
import { figuresIn } from '../../../utils/highlight'
import { QuoteText } from '../../molecules/QuoteText'

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

/** « LR_Produire_Plus_LIVRET.pdf » se lit « LR Produire Plus LIVRET ». */
const documentName = (title: string) =>
  /\.pdf$/i.test(title)
    ? title
        .replace(/\.pdf$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim()
    : title

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0

/**
 * Le programme d'un candidat, lu en entier, sans une phrase écrite par une
 * machine : des comptes, ses propres titres, ses mots, ses citations.
 */
export function CandidateProgramme({ programme: p }: { programme: Programme }) {
  const { summary: s } = p
  if (s.passages === 0) return null
  const maxCount = Math.max(...p.vocabulary.map((v) => v.count), 1)
  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
          Son programme, lu en entier
        </h2>

        {/* Le résumé : rien que des comptes. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact value={s.passages} label="passages lus">
            dans {s.documents} document{s.documents > 1 ? 's' : ''}
          </Fact>
          <Fact value={s.proposals} label="propositions">
            passages qui commencent par un verbe d’action (
            {percent(s.proposals, s.passages)} %)
          </Fact>
          <Fact value={s.figured} label="passages chiffrés">
            avec un montant, un pourcentage, une durée ou un volume
          </Fact>
          <Fact
            value={`${percent(s.covered, s.passages)} %`}
            label="couverts par nos sujets"
          >
            {s.covered} passages rangés dans au moins un des sujets suivis
          </Fact>
        </div>

        {s.topTopics.length > 0 && (
          <div className="rounded-[28px] bg-white p-6 md:p-8">
            <p className="font-extrabold text-[#0B1A2A]">
              Les sujets les plus présents
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {s.topTopics.map((t) => (
                <li key={t.slug}>
                  <Link
                    to="/enjeux/$slug"
                    params={{ slug: t.slug }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#F4F6F8] px-4 py-2 text-[0.9rem] font-bold text-[#0B1A2A] no-underline hover:bg-[#E8ECF0]"
                  >
                    {t.name}
                    <span className={`font-semibold tabular-nums ${MUTED}`}>
                      {t.passages}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {p.vocabulary.length > 0 && (
          <div className="rounded-[28px] bg-white p-6 md:p-8">
            <p className="font-extrabold text-[#0B1A2A]">Son vocabulaire</p>
            <p className={`mt-1 text-[0.88rem] ${MUTED}`}>
              Les mots employés nettement plus que dans les autres programmes ;
              la taille suit le nombre d’emplois.
            </p>
            <ul className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              {p.vocabulary.map((v) => (
                <li
                  key={v.word}
                  title={`${v.count} emplois`}
                  className="leading-tight font-extrabold tracking-[-0.02em] text-[#0B1A2A]"
                  style={{
                    fontSize: `${0.95 + 1.15 * Math.sqrt(v.count / maxCount)}rem`,
                    opacity: 0.55 + 0.45 * Math.sqrt(v.count / maxCount),
                  }}
                >
                  {v.word}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Outline outline={p.outline} />

        {p.figured.length > 0 && <Figured figured={p.figured} />}
      </div>
    </section>
  )
}

function Fact({
  value,
  label,
  children,
}: {
  value: number | string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] bg-white p-5">
      <p className="text-[2.2rem] leading-none font-extrabold text-[#0B1A2A] tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-bold text-[#0B1A2A]">{label}</p>
      <p className={`mt-1 text-[0.82rem] leading-snug ${MUTED}`}>{children}</p>
    </div>
  )
}

/** Sa structure : ses documents, puis ses rubriques, dans ses propres titres. */
function Outline({ outline }: { outline: Programme['outline'] }) {
  const [open, setOpen] = useState(false)
  const headings = outline.reduce((n, d) => n + d.headings.length, 0)
  return (
    <div className="rounded-[28px] bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 p-6 text-left md:p-8"
      >
        <span>
          <span className="block font-extrabold text-[#0B1A2A]">
            Ses étapes, dans ses propres titres
          </span>
          <span className={`mt-1 block text-[0.88rem] ${MUTED}`}>
            {outline.length} document{outline.length > 1 ? 's' : ''}, {headings}{' '}
            rubriques, avec le nombre de passages de chacune
          </span>
        </span>
        <ChevronDown
          size={22}
          className={`shrink-0 text-[#0B1A2A] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ol className="space-y-6 border-t border-[#0B1A2A]/8 p-6 md:p-8">
          {outline.map((d) => (
            <li key={d.url}>
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-[#0B1A2A] no-underline hover:underline"
              >
                {documentName(d.title)}
                <span className={`font-semibold ${MUTED}`}>
                  · {d.passages} passages
                </span>
                <ArrowUpRight size={14} />
              </a>
              {d.headings.length > 0 && (
                <ul className="mt-2 divide-y divide-[#0B1A2A]/6">
                  {d.headings.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-baseline justify-between gap-4 py-1.5 text-[0.92rem]"
                    >
                      <span className="text-[#0B1A2A]">{h.heading}</span>
                      <span className={`shrink-0 tabular-nums ${MUTED}`}>
                        {h.passages}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** Les premiers passages chiffrés ; les autres se déplient. */
const FIGURED_SHOWN = 12

/** Tous les passages chiffrés, dans l'ordre du programme, chiffres surlignés. */
function Figured({ figured }: { figured: Programme['figured'] }) {
  const [all, setAll] = useState(false)
  const shown = all ? figured : figured.slice(0, FIGURED_SHOWN)
  return (
    <div className="rounded-[28px] bg-white p-6 md:p-8">
      <p className="font-extrabold text-[#0B1A2A]">
        Ses passages chiffrés · {figured.length}
      </p>
      <p className={`mt-1 text-[0.88rem] ${MUTED}`}>
        Tous, dans l’ordre du programme, mot pour mot ; les chiffres sont
        surlignés.
      </p>
      <ol className="mt-5 space-y-5 border-l-2 border-[#0B1A2A]/10 pl-5 md:pl-7">
        {shown.map((f, i) => (
          <li key={i}>
            <p className={`mb-1 text-[0.8rem] font-bold ${MUTED}`}>
              {documentName(f.document.title)}
              {f.heading && f.heading !== f.document.title
                ? ` · ${f.heading}`
                : ''}
            </p>
            <QuoteText text={f.quote} terms={figuresIn(f.quote)} />
          </li>
        ))}
      </ol>
      {figured.length > FIGURED_SHOWN && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="mt-6 inline-flex h-10 items-center rounded-full bg-[#F4F6F8] px-5 text-[0.9rem] font-bold text-[#0B1A2A] hover:bg-[#E8ECF0]"
        >
          {all ? 'Replier' : 'Voir tout'}
        </button>
      )}
    </div>
  )
}
