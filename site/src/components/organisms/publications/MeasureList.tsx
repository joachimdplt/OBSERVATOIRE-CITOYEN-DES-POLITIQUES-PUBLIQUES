import { ArrowUpRight } from 'lucide-react'
import type { PublicationSheet } from '../../../types/public'
import { frenchDate } from '../../../utils/date'

type Measure = PublicationSheet['sections'][number]['measures'][number]

const KINDS: Record<Measure['document']['kind'], string> = {
  bill: 'Proposition de loi',
  government_bill: 'Projet de loi',
  law: 'Loi',
  amendment: 'Amendement',
  programme: 'Programme',
}

const CHAMBERS = {
  national_assembly: 'Assemblée nationale',
  senate: 'Sénat',
} as const

/**
 * Les textes rattachés à un maillon. La citation s'affiche d'abord, mot pour
 * mot, puis le libellé qui la reformule, puis le document, son auteur et son
 * groupe à la date du dépôt. Même présentation pour tous, dans l'ordre
 * alphabétique des premiers signataires.
 */
export function MeasureList({ measures }: { measures: Measure[] }) {
  if (measures.length === 0) return null
  return (
    <div className="mt-8 space-y-4">
      <p className="text-sm font-extrabold text-[#0B1A2A]">
        Textes déposés au Parlement
      </p>
      <ul className="space-y-4">
        {measures.map((m) => {
          const d = m.document
          return (
            <li
              key={`${d.url}-${m.quote.slice(0, 40)}`}
              className="rounded-2xl bg-[#F4F6F8] p-5"
            >
              <blockquote className="border-l-2 border-[#0B1A2A] pl-4 text-[0.98rem] leading-relaxed text-[#0B1A2A]">
                «&nbsp;{m.quote}&nbsp;»
                <span className="mt-1 block text-[0.8rem] text-[#5B6470]">
                  {m.article}
                </span>
              </blockquote>
              <p className="mt-3 text-[0.95rem] font-bold text-[#0B1A2A]">
                {m.label}
              </p>
              <p className="mt-2 text-[0.85rem] leading-relaxed text-[#5B6470]">
                {KINDS[d.kind]}
                {d.number ? ` n° ${d.number}` : ''}
                {d.chamber ? ` · ${CHAMBERS[d.chamber]}` : ''} · déposée le{' '}
                {frenchDate(d.filedAt)} · {d.firstAuthor}
                {d.authorGroup && (
                  <>
                    {' '}
                    (
                    {d.authorGroupSource ? (
                      <a
                        href={d.authorGroupSource}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        groupe {d.authorGroup}
                      </a>
                    ) : (
                      `groupe ${d.authorGroup}`
                    )}
                    )
                  </>
                )}
              </p>
              {d.progress && (
                <p className="mt-1 text-[0.85rem] text-[#5B6470]">
                  {d.progress}
                </p>
              )}
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[0.85rem] font-bold text-[#0B1A2A] no-underline hover:underline"
              >
                Lire le texte officiel <ArrowUpRight size={14} />
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
