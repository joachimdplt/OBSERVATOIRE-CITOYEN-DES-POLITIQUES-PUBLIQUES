import type { TopicSheet } from '../../../types/public'
import { squarify } from '../../../utils/treemap'
import { goTo } from '../../../utils/scroll'

type Candidate = TopicSheet['candidates'][number]

const surname = (name: string) => name.split(' ').slice(1).join(' ') || name

/**
 * Qui parle du sujet, en un carré : la photo de chaque candidat a une
 * surface proportionnelle à ses passages. Un clic mène à ses passages ;
 * pendant la lecture, la photo du candidat lu s'allume et les autres
 * s'effacent.
 */
export function CandidateMosaic({
  candidates,
  active,
}: {
  candidates: Candidate[]
  /** Le candidat dont on lit les passages : sa photo s'allume. */
  active?: string | null
}) {
  const cells = squarify(
    candidates
      .filter((c) => c.passages.length > 0)
      .map((c) => ({ value: c.passages.length, item: c })),
  )
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-[#F4F6F8]">
      {cells.map(({ x, y, w, h, item: c }) => (
        <a
          key={c.slug}
          href={`#candidat-${c.slug}`}
          onClick={(e) => goTo(e, c.slug)}
          title={`${c.name} : ${c.passages.length} passage${c.passages.length > 1 ? 's' : ''}`}
          className={`group absolute p-[2px] transition-opacity duration-300 ${
            active && active !== c.slug ? 'opacity-40' : 'opacity-100'
          }`}
          style={{
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: `${w * 100}%`,
            height: `${h * 100}%`,
          }}
        >
          <span
            className={`relative block size-full overflow-hidden rounded-[12px] bg-[#E8ECF0] transition-shadow duration-300 ${
              active === c.slug ? 'shadow-[0_0_0_3px_#0B1A2A]' : ''
            }`}
          >
            {c.photo && (
              <img
                src={c.photo}
                alt=""
                className={`size-full object-cover object-top transition-[filter] duration-300 group-hover:grayscale-0 ${
                  active === c.slug ? 'grayscale-0' : 'grayscale'
                }`}
              />
            )}
            {w > 0.16 && h > 0.14 && (
              <span className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-white/90 px-2 py-0.5 text-[0.7rem] font-bold text-[#0B1A2A] tabular-nums">
                {w > 0.34 && h > 0.2
                  ? `${surname(c.name)} · ${c.passages.length}`
                  : c.passages.length}
              </span>
            )}
          </span>
        </a>
      ))}
    </div>
  )
}
