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
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
const BASE = 34
const MAX = 60
const REACH = 110

type Props = {
  topics: GridTopic[]
  /** Le sujet donné par la machine : marqué d'un point. */
  current: string
  /** Pour reclasser : le sujet choisi (en noir) et le choix d'un sujet. */
  selected?: string | null
  onPick?: (code: string) => void
  /** Le sujet de la machine se choisit aussi : un refus fait par erreur. */
  allowCurrent?: boolean
}

/**
 * Les 21 sujets de la grille, en panneau, comme le Dock de macOS : la case
 * sous la souris grossit et dit son nom. Un clic ouvre la fiche du sujet sur
 * le même écran : tous ses sous-sujets, chacun avec sa définition. Pour
 * reclasser, la fiche permet de choisir ce sujet. Échap ferme la fiche.
 */
export function TopicDock({
  topics,
  current,
  selected,
  onPick,
  allowCurrent = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState<number | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const openTopic = topics.find((t) => t.code === open)

  // Échap ferme la fiche avant de quitter l'écran.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(null)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [open])

  const sizeOf = (index: number) => {
    const el = ref.current?.children[index] as HTMLElement | undefined
    if (mouse === null || !el) return BASE
    const center = el.offsetLeft + el.offsetWidth / 2
    const near = Math.max(0, 1 - Math.abs(mouse - center) / REACH)
    return BASE + (MAX - BASE) * near * near
  }

  return (
    <div className="relative flex justify-center">
      {openTopic && (
        <Sheet
          topic={openTopic}
          current={openTopic.code === current}
          onClose={() => setOpen(null)}
          onPick={
            onPick && (allowCurrent || openTopic.code !== current)
              ? () => {
                  onPick(openTopic.code)
                  setOpen(null)
                }
              : undefined
          }
        />
      )}
      <div
        ref={ref}
        onMouseMove={(e) => {
          const box = ref.current?.getBoundingClientRect()
          if (box) setMouse(e.clientX - box.left)
        }}
        onMouseLeave={() => {
          setMouse(null)
          setHovered(null)
        }}
        className="glass-dock relative flex h-[76px] items-center gap-1 rounded-[40px] px-3"
      >
        {topics.map((t, i) => {
          const Icon = ICONS[t.code] ?? Landmark
          const size = sizeOf(i)
          const isCurrent = t.code === current
          const isDark =
            selected === undefined ? isCurrent : t.code === selected
          const isOpen = t.code === open
          return (
            <div
              key={t.code}
              onMouseEnter={() => setHovered(t.code)}
              className="relative flex flex-col items-center"
            >
              {hovered === t.code && !openTopic && (
                <span className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow">
                  {t.label}
                </span>
              )}
              <button
                type="button"
                aria-label={t.label}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : t.code)}
                style={{ width: size, height: size }}
                className={`glass-bubble flex items-center justify-center rounded-full ${
                  isDark ? 'glass-bubble-active text-white' : 'text-[#0B1A2A]'
                } ${isOpen ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
              >
                <Icon size={Math.round(size * 0.45)} strokeWidth={1.8} />
              </button>
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
 * La fiche d'un sujet, ouverte au-dessus du panneau : chaque sous-sujet
 * avec sa définition en français, l'officielle en anglais et son code.
 */
function Sheet({
  topic,
  current,
  onClose,
  onPick,
}: {
  topic: GridTopic
  current: boolean
  onClose: () => void
  onPick?: () => void
}) {
  const single = topic.subtopics.length === 1
  return (
    <section className="absolute bottom-full z-30 mb-3 flex max-h-[62vh] w-[min(760px,92vw)] flex-col rounded-2xl bg-slate-900 text-white shadow-2xl">
      <header className="flex items-start gap-4 border-b border-white/10 px-6 py-4">
        <div className="flex-1">
          <p className="text-lg font-semibold">{topic.label}</p>
          <p className="text-xs text-slate-400">
            {current
              ? 'Le sujet donné par la machine'
              : `${topic.subtopics.length} sous-sujet${topic.subtopics.length > 1 ? 's' : ''}`}
          </p>
        </div>
        {onPick && (
          <button
            type="button"
            onClick={onPick}
            className="h-9 rounded-lg bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-200"
          >
            {current ? 'Finalement, ce sujet est juste' : 'Choisir ce sujet'}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </header>
      <ul
        className={`grid gap-x-8 gap-y-5 overflow-y-auto px-6 py-5 ${single ? '' : 'md:grid-cols-2'}`}
      >
        {topic.subtopics.map((s) => (
          <li key={s.code} className="text-sm">
            {!single && <p className="font-medium text-white">{s.label}</p>}
            <Definition subtopic={s} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** La définition française, l'officielle en anglais, et leur origine. */
function Definition({ subtopic }: { subtopic: GridSubtopic }) {
  return (
    <div className="mt-1 space-y-1 text-xs">
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
        Code {subtopic.code}
        {subtopic.translatedBy === 'assistant' &&
          ', traduction d’un assistant, non relue'}
      </p>
    </div>
  )
}
