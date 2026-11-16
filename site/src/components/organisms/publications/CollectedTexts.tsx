import { ArrowUpRight } from 'lucide-react'
import type { CollectedText } from '../../../types/public'
import { frenchDate } from '../../../utils/date'
import { collectedAnchor, collectedGroup } from './MeasureComparison'

/**
 * Les textes collectés automatiquement sur les données ouvertes du
 * Parlement, non relus. Chacun donne son auteur, son groupe au jour du
 * dépôt, et ses articles mot pour mot, à déplier. Aucun libellé n'est écrit
 * par la machine.
 */
export function CollectedTexts({ texts }: { texts: CollectedText[] }) {
  if (texts.length === 0) return null
  return (
    <section className="mx-auto mt-12 max-w-[1120px]">
      <h2 className="text-[1.6rem] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
        Autres textes déposés à l’Assemblée nationale
      </h2>
      <p className="mt-2 max-w-[62ch] text-[0.98rem] leading-relaxed text-[#5B6470]">
        Collectés automatiquement sur les données ouvertes de l’Assemblée,
        d’après les termes surveillés pour cet article ; non relus. Chaque
        article est cité mot pour mot.
      </p>
      <ul className="mt-6 space-y-3">
        {texts.map((t) => (
          <li
            key={collectedAnchor(t)}
            id={collectedAnchor(t)}
            className="scroll-mt-32 rounded-2xl bg-white p-5"
          >
            <p className="text-[0.8rem] font-semibold text-[#5B6470]">
              Collecté automatiquement, non relu · terme « {t.term} »
            </p>
            <p className="mt-1 font-bold text-[#0B1A2A]">{t.title}</p>
            <p className="mt-1 text-[0.85rem] text-[#5B6470]">
              n° {t.number} · déposée le {frenchDate(t.filedAt)} ·{' '}
              {t.firstAuthor} (
              {t.authorGroupSource ? (
                <a
                  href={t.authorGroupSource}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  groupe {collectedGroup(t)}
                </a>
              ) : (
                collectedGroup(t)
              )}
              )
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <a
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[0.85rem] font-bold text-[#0B1A2A] no-underline hover:underline"
              >
                Lire le texte officiel <ArrowUpRight size={14} />
              </a>
            </div>
            {t.articles.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[0.85rem] font-bold text-[#0B1A2A]">
                  {t.articles.length} article{t.articles.length > 1 ? 's' : ''},
                  mot pour mot
                </summary>
                <ol className="mt-3 space-y-3">
                  {t.articles.map((a) => (
                    <li key={a.article}>
                      <p className="text-[0.8rem] font-bold text-[#5B6470]">
                        {a.article}
                      </p>
                      <blockquote className="mt-1 glass-text text-justify hyphens-auto text-[0.9rem] leading-relaxed whitespace-pre-line text-[#0B1A2A]">
                        {a.quote}
                      </blockquote>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
