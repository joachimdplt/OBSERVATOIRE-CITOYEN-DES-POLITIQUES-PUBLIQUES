import { ExternalLink } from 'lucide-react'
import type { CheckCard as Card } from '../../../types/checks'

type Props = { card: Card }

/**
 * Une carte : d'abord le texte du candidat, mot pour mot, puis le sujet où
 * la machine l'a rangé. On lit, puis on juge.
 */
export function CheckCard({ card }: Props) {
  return (
    <article className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        {card.section && (
          <p
            className="text-sm font-semibold text-slate-500"
            title={card.section.source}
          >
            {card.section.section}
          </p>
        )}
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {card.heading}
        </h2>
        <a
          href={card.document.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
        >
          {card.document.title}
          <ExternalLink size={12} />
        </a>
      </header>
      <div className="space-y-4 text-[17px] leading-relaxed text-slate-800">
        {card.passages.map((p, i) => (
          <p key={i}>
            {p.quote}
            {p.page !== null && (
              <span className="ml-2 text-xs text-slate-400">p. {p.page}</span>
            )}
          </p>
        ))}
      </div>
    </article>
  )
}
