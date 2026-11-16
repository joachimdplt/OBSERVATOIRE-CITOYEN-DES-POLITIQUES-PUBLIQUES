import { splitOnTerms } from '../../utils/highlight'

/**
 * Une citation mot pour mot, en entier, les termes cherchés surlignés.
 */
export function QuoteText({
  text,
  terms = [],
}: {
  text: string
  /** Les termes cherchés, surlignés ; aucun par défaut. */
  terms?: string[]
}) {
  const parts = splitOnTerms(text, terms)
  // Une citation qui porte déjà ses guillemets ne les reçoit pas deux fois.
  const quoted = /^\s*[«“"]/.test(text) && /[»”"]\s*$/.test(text)
  return (
    <blockquote className="text-[1rem] leading-[1.65] text-[#0B1A2A]">
      {quoted ? '' : '«\u00a0'}
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
      {quoted ? '' : '\u00a0»'}
    </blockquote>
  )
}
