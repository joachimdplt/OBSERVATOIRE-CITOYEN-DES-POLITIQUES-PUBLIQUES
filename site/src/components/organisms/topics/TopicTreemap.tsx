import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { TopicList } from '../../../types/public'
import { squarify } from '../../../utils/treemap'

type Topic = TopicList['topics'][number]
type Candidate = Topic['candidates'][number]

/** « Jean-Luc Mélenchon » se lit « Mélenchon » dans une pastille. */
const surname = (name: string) => name.split(' ').slice(1).join(' ') || name

const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)

/** La hauteur du titre d'une case de sujet, en pixels. */
const HEADER = 46

/**
 * Les sujets des programmes en une seule mosaïque, à deux niveaux : la
 * surface de chaque sujet est proportionnelle à son nombre de passages, et
 * dans chaque sujet, la photo de chaque candidat l'est aussi. Le pavage se
 * recalcule à la largeur de l'écran ; une case trop petite ne garde que le
 * nom du sujet, le détail au survol.
 */
export function TopicTreemap({ topics }: { topics: Topic[] }) {
  const box = useRef<HTMLDivElement>(null)
  // Avant la mesure (rendu serveur), une largeur d'écran d'ordinateur.
  const [size, setSize] = useState({ w: 1280, h: 1400 })

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      // Plus haut que large sur téléphone, pour que les cases restent lisibles.
      const h = w < 640 ? w * 3.2 : w < 1024 ? w * 1.6 : w * 1.1
      setSize({ w, h })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const cells = squarify(
    topics.map((t) => ({ value: t.passages, item: t })),
    size.w / size.h,
  )

  return (
    <div ref={box} className="relative w-full" style={{ height: size.h }}>
      {cells.map(({ x, y, w, h, item: t }) => (
        <TopicCell
          key={t.slug}
          topic={t}
          left={x * size.w}
          top={y * size.h}
          width={w * size.w}
          height={h * size.h}
        />
      ))}
    </div>
  )
}

function TopicCell({
  topic,
  left,
  top,
  width,
  height,
}: {
  topic: Topic
  left: number
  top: number
  width: number
  height: number
}) {
  const roomy = width > 130 && height > 130
  const inner = { w: width - 12, h: height - 12 - HEADER }
  const people = roomy
    ? squarify(
        topic.candidates.map((c) => ({ value: c.passages, item: c })),
        inner.w / inner.h,
      )
    : []
  return (
    <div className="absolute p-[3px]" style={{ left, top, width, height }}>
      <Link
        to="/enjeux/$slug"
        params={{ slug: topic.slug }}
        title={`${topic.name} : ${topic.passages} passages, ${topic.candidates.length} candidats`}
        className="group flex size-full flex-col overflow-hidden rounded-[16px] bg-white p-1.5 no-underline transition-shadow hover:shadow-[0_8px_30px_rgba(11,26,42,0.12)]"
      >
        <div
          className="flex shrink-0 flex-col justify-center overflow-hidden px-1.5"
          style={{ height: roomy ? HEADER : '100%' }}
        >
          <p
            className={`leading-tight font-extrabold tracking-[-0.01em] text-[#0B1A2A] group-hover:underline ${
              roomy ? 'truncate text-[0.95rem]' : 'line-clamp-3 text-[0.72rem]'
            }`}
          >
            {topic.name}
          </p>
          <p className="truncate text-[0.68rem] text-[#5B6470] tabular-nums">
            {topic.passages} passages
          </p>
        </div>
        {roomy && (
          <div className="relative flex-1">
            {people.map(({ x, y, w, h, item: c }) => (
              <Person
                key={c.slug}
                person={c}
                x={x}
                y={y}
                w={w}
                h={h}
                px={{ w: w * inner.w, h: h * inner.h }}
              />
            ))}
          </div>
        )}
      </Link>
    </div>
  )
}

function Person({
  person: c,
  x,
  y,
  w,
  h,
  px,
}: {
  person: Candidate
  x: number
  y: number
  w: number
  h: number
  px: { w: number; h: number }
}) {
  const named = px.w > 90 && px.h > 60
  const counted = px.w > 30 && px.h > 30
  return (
    <div
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
          <span className="flex size-full items-center justify-center text-[0.75rem] font-extrabold text-[#0B1A2A]/40">
            {initials(c.name)}
          </span>
        )}
        {counted && (
          <span className="absolute bottom-1 left-1 max-w-[calc(100%-8px)] truncate rounded-full bg-white/90 px-1.5 py-0.5 text-[0.64rem] font-bold text-[#0B1A2A] tabular-nums">
            {named ? `${surname(c.name)} · ${c.passages}` : c.passages}
          </span>
        )}
      </div>
    </div>
  )
}
