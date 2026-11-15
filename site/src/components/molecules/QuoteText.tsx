import { useState } from 'react'
import { splitOnTerms } from '../../utils/highlight'

/** Au-delà, une citation se replie et se déplie d'un clic. */
const LONG = 420

/**
 * Une citation mot pour mot, les termes cherchés surlignés. Une longue
 * citation se replie sur ses premières lignes ; « Lire tout » la déplie, sans
 * rien couper du texte.
 */
export function QuoteText({ text, terms }: { text: string; terms: string[] }) {
  const long = text.length > LONG
  const [open, setOpen] = useState(!long)
  const parts = splitOnTerms(text, terms)
  return (
    <div>
      <blockquote
        className={`text-[1rem] leading-[1.65] text-[#0B1A2A] ${open ? '' : 'line-clamp-4'}`}
      >
        «&nbsp;
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <mark
              key={i}
              className="rounded-[4px] bg-[#0B1A2A] px-1 font-semibold text-white"
            >
              {p}
            </mark>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
        &nbsp;»
      </blockquote>
      {long && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-1.5 text-[0.85rem] font-bold text-[#0B1A2A] hover:underline"
        >
          {open ? 'Replier' : 'Lire tout'}
        </button>
      )}
    </div>
  )
}
