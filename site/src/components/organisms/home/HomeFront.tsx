import { Link } from '@tanstack/react-router'
import { ArrowRight, Check } from 'lucide-react'
import { Highlight } from '../../atoms/Highlight'
import { HOME } from '../../../data/home'
import { pillarLabel } from '../../../data/pillars'
import type { PublicationSheet } from '../../../types/public'
import { frenchDate } from '../../../utils/date'
import { groupOf } from '../publications/MeasureComparison'

const MUTED = 'text-[#5B6470]'

/**
 * L'ouverture, sur fond sombre : le nom de l'observatoire, sa phrase en
 * écriture manuscrite, ses trois garanties, et le coq qui observe les
 * données, détouré sur le bleu nuit.
 */
export function HomeHero() {
  const { hero } = HOME
  return (
    <section className="px-3 pt-3 md:px-6 md:pt-6">
      <div className="mx-auto grid max-w-[1400px] items-center gap-4 overflow-hidden rounded-[36px] bg-[#0B1A2A] px-6 py-12 md:px-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:py-10">
        <img
          src="/images/coq-observateur.png"
          alt="Un coq qui observe un graphique à la loupe"
          width={1000}
          height={667}
          className="mx-auto w-full max-w-[600px] md:-ml-16 md:scale-125"
        />
        <div>
          <h1 className="text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.08] font-extrabold tracking-[-0.03em] whitespace-pre-line text-white">
            <Highlight text={hero.title} dark />
          </h1>
          <p className="font-script mt-5 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-tight text-white/85">
            {hero.lead}
          </p>
          <ul className="mt-7 flex flex-wrap gap-2">
            {hero.guarantees.map((g) => (
              <li
                key={g}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pr-4 pl-1.5 text-[0.88rem] font-semibold text-white"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-white text-[#0B1A2A]">
                  <Check size={13} strokeWidth={3} aria-hidden />
                </span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/**
 * Les articles de l'observatoire, le plus récent en premier : pilier, date,
 * titre, chapô et contenu.
 */
export function HomeFront({ articles }: { articles: PublicationSheet[] }) {
  const { articles: copy } = HOME
  return (
    <section className="px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          {copy.title}
        </h2>
        {articles.length === 0 ? (
          <p className={`mt-4 ${MUTED}`}>{copy.empty}</p>
        ) : (
          <ul className="mt-6 space-y-5">
            {articles.map((a) => {
              const measures = a.sections.flatMap((s) => s.measures)
              const groups = new Set(measures.map(groupOf))
              const indicators = new Set(
                a.sections.flatMap((s) => s.indicators.map((i) => i.code)),
              )
              return (
                <li key={a.slug}>
                  <Link
                    to="/sujets/$slug"
                    params={{ slug: a.slug }}
                    className="group block rounded-[28px] bg-white p-6 no-underline shadow-[0_1px_2px_rgba(11,26,42,0.04)] transition-shadow hover:shadow-[0_8px_30px_rgba(11,26,42,0.08)] md:p-9"
                  >
                    <p className={`text-sm font-semibold ${MUTED}`}>
                      {pillarLabel(a.pillar)}
                      {a.publishedAt
                        ? ` · ${frenchDate(a.publishedAt.slice(0, 10))}`
                        : ''}
                      {a.authoredBy ? ` · par ${a.authoredBy}` : ''}
                    </p>
                    <p className="mt-3 text-[clamp(1.6rem,3vw,2.4rem)] leading-tight font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
                      {a.title}
                    </p>
                    <p
                      className={`mt-4 max-w-[70ch] text-[1.05rem] leading-relaxed ${MUTED}`}
                    >
                      {a.summary}
                    </p>
                    <p className="mt-5 flex flex-wrap gap-2 text-[0.85rem] font-semibold text-[#0B1A2A]">
                      <span className="rounded-full bg-[#F4F6F8] px-3 py-1">
                        {a.sections.length} parties
                      </span>
                      <span className="rounded-full bg-[#F4F6F8] px-3 py-1">
                        {indicators.size} indicateurs officiels
                      </span>
                      {measures.length > 0 && (
                        <span className="rounded-full bg-[#F4F6F8] px-3 py-1">
                          {measures.length} mesures de {groups.size} groupes
                        </span>
                      )}
                      <span className="rounded-full px-3 py-1 ring-1 ring-[#0B1A2A]/15">
                        {a.statusLabel}
                      </span>
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 font-extrabold text-[#0B1A2A]">
                      {copy.read}
                      <ArrowRight
                        size={17}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
