import {
  Briefcase,
  Cpu,
  Gavel,
  Globe,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Leaf,
  Luggage,
  Mountain,
  Palette,
  Scale,
  Shield,
  Ship,
  Store,
  TrainFront,
  TrendingUp,
  Wheat,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import type { GridSubtopic, GridTopic } from '../../../types/checks'

/** Une icône par grand sujet de la grille CAP. */
const ICONS: Record<string, LucideIcon> = {
  '1': TrendingUp,
  '2': Scale,
  '3': HeartPulse,
  '4': Wheat,
  '5': Briefcase,
  '6': GraduationCap,
  '7': Leaf,
  '8': Zap,
  '9': Luggage,
  '10': TrainFront,
  '12': Gavel,
  '13': HandHeart,
  '14': House,
  '15': Store,
  '16': Shield,
  '17': Cpu,
  '18': Ship,
  '19': Globe,
  '20': Landmark,
  '21': Mountain,
  '23': Palette,
}

/** La taille d'une case au repos, au plus près de la souris, et la portée
 * du grossissement, en pixels. */
const BASE = 40
const MAX = 68
const REACH = 110

type Props = { topics: GridTopic[]; current: string }

/**
 * Les 21 sujets de la grille, en panneau, comme le Dock de macOS : la case
 * sous la souris grossit, ses voisines un peu moins, et une bulle déroule
 * le sujet et ses sous-sujets. Le sujet donné par la machine est en noir,
 * marqué d'un point.
 */
export function TopicDock({ topics, current }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState<number | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  // La souris dans la bulle : le panneau se fige, pour que la bulle ne
  // bouge pas pendant la lecture.
  const [reading, setReading] = useState(false)

  const sizeOf = (index: number) => {
    const el = ref.current?.children[index] as HTMLElement | undefined
    if (mouse === null || !el) return BASE
    const center = el.offsetLeft + el.offsetWidth / 2
    const near = Math.max(0, 1 - Math.abs(mouse - center) / REACH)
    return BASE + (MAX - BASE) * near * near
  }

  return (
    <div className="flex justify-center">
      <div
        ref={ref}
        onMouseMove={(e) => {
          if (reading) return
          const box = ref.current?.getBoundingClientRect()
          if (box) setMouse(e.clientX - box.left)
        }}
        onMouseLeave={() => {
          setMouse(null)
          setHovered(null)
          setReading(false)
        }}
        className="relative flex h-[84px] items-end gap-1.5 rounded-2xl border border-slate-200 bg-white/80 px-3 pb-2.5 shadow-sm backdrop-blur"
      >
        {topics.map((t, i) => {
          const Icon = ICONS[t.code] ?? Landmark
          const size = sizeOf(i)
          const isCurrent = t.code === current
          return (
            <div
              key={t.code}
              onMouseEnter={() => !reading && setHovered(t.code)}
              className="relative flex flex-col items-center"
            >
              {hovered === t.code && (
                <Bubble
                  key={t.code}
                  topic={t}
                  current={isCurrent}
                  onReading={setReading}
                  align={
                    i < 3 ? 'start' : i >= topics.length - 3 ? 'end' : 'center'
                  }
                />
              )}
              <div
                aria-label={t.label}
                style={{ width: size, height: size }}
                className={`flex items-center justify-center rounded-xl transition-[width,height] duration-75 ease-out ${
                  isCurrent
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon size={Math.round(size * 0.45)} strokeWidth={1.8} />
              </div>
              <span
                className={`mt-1 h-1 w-1 rounded-full ${isCurrent ? 'bg-slate-900' : 'bg-transparent'}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * La bulle : le sujet et ses sous-sujets. La souris sur un sous-sujet
 * déroule sa définition en français, puis l'officielle en anglais, qui
 * fait foi.
 */
function Bubble({
  topic,
  current,
  align,
  onReading,
}: {
  topic: GridTopic
  current: boolean
  align: 'start' | 'center' | 'end'
  onReading: (reading: boolean) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  // Aux bords du panneau, la bulle s'aligne sur la case pour ne pas sortir
  // de l'écran.
  const place = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }[align]
  return (
    // Le pied transparent relie la case à la bulle : la souris y monte sans
    // quitter le panneau.
    <div
      onMouseEnter={() => onReading(true)}
      onMouseLeave={() => onReading(false)}
      className={`absolute bottom-full z-30 pb-3 ${place}`}
    >
      <div className="max-h-[60vh] w-80 overflow-y-auto rounded-xl bg-slate-900 px-4 py-3 text-left text-white shadow-lg">
        <p className="text-sm font-semibold">{topic.label}</p>
        {current && (
          <p className="text-[11px] text-slate-400">
            Le sujet donné par la machine
          </p>
        )}
        <ul className="mt-2 space-y-0.5">
          {topic.subtopics.map((s) => (
            <Subtopic
              key={s.code}
              subtopic={s}
              open={open === s.code}
              onOpen={() => setOpen(s.code)}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

function Subtopic({
  subtopic,
  open,
  onOpen,
}: {
  subtopic: GridSubtopic
  open: boolean
  onOpen: () => void
}) {
  return (
    <li
      onMouseEnter={onOpen}
      className={`rounded-md px-2 py-1 text-xs transition-colors ${
        open ? 'bg-white/10 text-white' : 'text-slate-300'
      }`}
    >
      <span>{subtopic.label}</span>
      {open && (
        <div className="mt-1 space-y-1.5 pb-1">
          {subtopic.definition ? (
            <p className="leading-snug text-slate-200">{subtopic.definition}</p>
          ) : (
            <p className="text-slate-400">Pas encore traduite.</p>
          )}
          {subtopic.official && (
            <p className="leading-snug text-slate-400 italic">
              {subtopic.official}
            </p>
          )}
          <p className="text-[10px] text-slate-500">
            Code {subtopic.code}, définition officielle du Comparative Agendas
            Project.
            {subtopic.translatedBy === 'assistant' &&
              ' Traduction d’un assistant, non relue.'}
          </p>
        </div>
      )}
    </li>
  )
}
