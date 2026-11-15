import { Link } from '@tanstack/react-router'
import { pillarLabel } from '../../../data/pillars'
import type { TopicList } from '../../../types/public'
import { squarify } from '../../../utils/treemap'

type Topic = TopicList['topics'][number]

/** « Jean-Luc Mélenchon » se lit « Mélenchon » dans une pastille. */
const surname = (name: string) => name.split(' ').slice(1).join(' ') || name

const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)

/**
 * Un sujet en une tuile : les photos des candidats qui en parlent, chacune
 * d'une surface proportionnelle à son nombre de passages sur le sujet, comme
 * les blocs d'une chaîne. Toutes les photos sont traitées de la même façon
 * (noir et blanc, même arrondi) ; seul le compte change leur taille.
 */
export function TopicTile({ topic }: { topic: Topic }) {
  const cells = squarify(
    topic.candidates.map((c) => ({ value: c.passages, item: c })),
  )
  return (
    <Link
      to="/enjeux/$slug"
      params={{ slug: topic.slug }}
      className="group flex flex-col rounded-[22px] bg-white p-2 no-underline transition-shadow hover:shadow-[0_8px_30px_rgba(11,26,42,0.10)]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[16px] bg-[#F4F6F8]">
        {cells.map(({ x, y, w, h, item: c }) => {
          // Le nom tient dans une grande case ; le compte seul dans une moyenne.
          const big = w > 0.4 && h > 0.2
          const medium = w > 0.16 && h > 0.14
          return (
            <div
              key={c.slug}
              className="absolute p-[2px]"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                width: `${w * 100}%`,
                height: `${h * 100}%`,
              }}
              title={`${c.name} : ${c.passages} passage${c.passages > 1 ? 's' : ''}`}
            >
              <div className="relative size-full overflow-hidden rounded-[10px] bg-[#E8ECF0]">
                {c.photo ? (
                  <img
                    src={c.photo}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover object-top grayscale transition-[filter] duration-300 group-hover:grayscale-0"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-[0.8rem] font-extrabold text-[#0B1A2A]/40">
                    {initials(c.name)}
                  </span>
                )}
                {medium && (
                  <span className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-white/90 px-2 py-0.5 text-[0.68rem] font-bold text-[#0B1A2A] tabular-nums">
                    {big ? `${surname(c.name)} · ${c.passages}` : c.passages}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-2 pt-3 pb-2">
        <p className="leading-tight font-extrabold tracking-[-0.01em] text-[#0B1A2A] group-hover:underline">
          {topic.name}
        </p>
        <p className="mt-1 text-[0.78rem] text-[#5B6470]">
          {pillarLabel(topic.pillar)} · {topic.candidates.length} candidat
          {topic.candidates.length > 1 ? 's' : ''} · {topic.passages} passages
        </p>
      </div>
    </Link>
  )
}
