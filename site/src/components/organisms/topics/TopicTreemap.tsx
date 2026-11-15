import { Link, useNavigate } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { TopicList } from '../../../types/public'
import { HEAT_GRADIENT, heatColor, isDark } from '../../../utils/heat'
import { squarify } from '../../../utils/treemap'

type Topic = TopicList['topics'][number]
type Candidate = Topic['candidates'][number]

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
 * dans chaque sujet, la photo de chaque candidat l'est aussi. La couleur
 * suit la même mesure, du blanc (le moins) au noir (le plus) ; les cases
 * apparaissent de la plus présente à la moins présente. Le pavage se
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
  // La chaleur d'un sujet suit son rang : la plus forte en tête, la plus
  // froide en dernier.
  const ranked = [...topics].sort((a, b) => b.passages - a.passages)
  const heatOf = (slug: string) => {
    const i = ranked.findIndex((t) => t.slug === slug)
    return ranked.length > 1 ? 1 - i / (ranked.length - 1) : 1
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 text-[0.82rem] font-semibold text-[#5B6470]">
        <span>On en parle le moins</span>
        <span
          className="h-2.5 w-40 rounded-full md:w-64"
          style={{ background: HEAT_GRADIENT }}
          aria-hidden
        />
        <span>le plus</span>
      </div>
      <div ref={box} className="relative w-full" style={{ height: size.h }}>
        {cells.map(({ x, y, w, h, item: t }, i) => (
          <TopicCell
            key={t.slug}
            topic={t}
            order={i}
            heat={heatOf(t.slug)}
            left={x * size.w}
            top={y * size.h}
            width={w * size.w}
            height={h * size.h}
          />
        ))}
      </div>
    </div>
  )
}

function TopicCell({
  topic,
  order,
  heat,
  left,
  top,
  width,
  height,
}: {
  topic: Topic
  /** Le rang d'allumage : les plus chauds d'abord. */
  order: number
  /** De 0 (le moins) à 1 (le plus). */
  heat: number
  left: number
  top: number
  width: number
  height: number
}) {
  const reduce = useReducedMotion()
  const hot = heat > 0.95
  const cold = heat < 0.15
  const dark = isDark(heat)
  const roomy = width > 130 && height > 130
  const inner = { w: width - 12, h: height - 12 - HEADER }
  const people = roomy
    ? squarify(
        topic.candidates.map((c) => ({ value: c.passages, item: c })),
        inner.w / inner.h,
      )
    : []
  return (
    <motion.div
      className="absolute p-[3px]"
      style={{ left, top, width, height }}
      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.45,
        ease: [0.34, 1.56, 0.64, 1],
        delay: reduce ? 0 : Math.min(order * 0.035, 1.6),
      }}
    >
      {/* Les plus présents rayonnent : un halo sombre qui respire. */}
      {hot && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-[3px] rounded-[16px]"
          animate={{
            boxShadow: [
              `0 0 0px 0px ${heatColor(1, 0)}`,
              `0 0 28px 6px ${heatColor(1, 0.45)}`,
              `0 0 0px 0px ${heatColor(1, 0)}`,
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <Link
        to="/enjeux/$slug"
        params={{ slug: topic.slug }}
        title={`${topic.name} : ${topic.passages} passages, ${topic.candidates.length} candidats`}
        className="group relative flex size-full flex-col overflow-hidden rounded-[16px] p-1.5 no-underline transition-shadow hover:shadow-[0_8px_30px_rgba(11,26,42,0.12)]"
        style={{
          backgroundColor: heatColor(heat),
          // Les moins présents, blancs, se détachent du fond par un filet.
          boxShadow: cold ? 'inset 0 0 0 1px rgba(11,26,42,0.08)' : undefined,
        }}
      >
        <div
          className="flex shrink-0 flex-col justify-center overflow-hidden px-1.5"
          style={{ height: roomy ? HEADER : '100%' }}
        >
          <p
            className={`leading-tight font-extrabold tracking-[-0.01em] group-hover:underline ${
              dark ? 'text-white' : 'text-[#0B1A2A]'
            } ${
              roomy ? 'truncate text-[0.95rem]' : 'line-clamp-3 text-[0.72rem]'
            }`}
          >
            {topic.name}
          </p>
          <p
            className={`truncate text-[0.68rem] font-semibold tabular-nums ${
              dark ? 'text-white/70' : 'text-[#0B1A2A]/65'
            }`}
          >
            {topic.passages} passages
          </p>
        </div>
        {roomy && (
          <div className="relative flex-1">
            {people.map(({ x, y, w, h, item: c }) => (
              <Person
                key={c.slug}
                topic={topic.slug}
                person={c}
                x={x}
                y={y}
                w={w}
                h={h}
              />
            ))}
          </div>
        )}
      </Link>
    </motion.div>
  )
}

function Person({
  topic,
  person: c,
  x,
  y,
  w,
  h,
}: {
  topic: string
  person: Candidate
  x: number
  y: number
  w: number
  h: number
}) {
  const navigate = useNavigate()
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
      // La photo ouvre le sujet directement sur les passages de ce candidat.
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void navigate({
          to: '/enjeux/$slug',
          params: { slug: topic },
          hash: `candidat-${c.slug}`,
          hashScrollIntoView: false,
        })
      }}
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
      </div>
    </div>
  )
}
