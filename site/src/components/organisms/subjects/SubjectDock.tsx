import { Link } from '@tanstack/react-router'
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
import { useEffect, useRef, useState } from 'react'

/** Une icône par grand sujet de la grille, la même que dans l'admin. */
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

/** Le code de sujet d'une adresse « /sujets/grille/12 ». */
const codeOf = (path?: string) =>
  Number(path?.match(/\/sujets\/grille\/(\d+)/)?.[1] ?? 0)

/**
 * Le sens du glissement : vers un sujet plus loin dans la grille, l'écran
 * part vers le haut et le suivant arrive par le bas ; l'inverse sinon.
 */
const slide = {
  types: ({
    fromLocation,
    toLocation,
  }: {
    fromLocation?: { pathname: string }
    toLocation: { pathname: string }
  }) => [
    codeOf(toLocation.pathname) >= codeOf(fromLocation?.pathname)
      ? 'subject-next'
      : 'subject-prev',
  ],
}

/** La taille d'une case au repos, au plus près de la souris, et la portée
 * du grossissement, en pixels. */
const BASE = 46
const MAX = 78
const REACH = 110
/** L'écart entre deux bulles, en pixels. */
const GAP = 4

type Props = {
  topics: { code: string; label: string }[]
  /** Le sujet affiché, en noir. */
  active?: string
  /** Debout, fixé au bord droit de l'écran ; sinon couché, en haut. */
  vertical?: boolean
}

/**
 * Les sujets en dock, comme celui de macOS : la case sous la souris
 * grossit et dit son nom ; un clic affiche le sujet, le dock restant en
 * place. Debout, il reste visible au bord droit pendant toute la lecture ;
 * couché (petits écrans), il défile de côté.
 */
export function SubjectDock({ topics, active, vertical = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState<number | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  // Debout, les cases se règlent sur la hauteur de l'écran : les 21 sujets
  // tiennent toujours, au plus grand possible.
  const [base, setBase] = useState(BASE)
  useEffect(() => {
    if (!vertical) return
    const fit = () =>
      setBase(
        Math.max(
          24,
          Math.min(
            BASE,
            Math.floor((window.innerHeight - 96) / topics.length) - GAP,
          ),
        ),
      )
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [vertical, topics.length])

  const sizeOf = (index: number) => {
    const el = ref.current?.children[index] as HTMLElement | undefined
    if (mouse === null || !el) return base
    const center = vertical
      ? el.offsetTop + el.offsetHeight / 2
      : el.offsetLeft + el.offsetWidth / 2
    const near = Math.max(0, 1 - Math.abs(mouse - center) / REACH)
    return base + (MAX - base) * near * near
  }

  const dock = (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const box = ref.current?.getBoundingClientRect()
        if (box) setMouse(vertical ? e.clientY - box.top : e.clientX - box.left)
      }}
      onMouseLeave={() => {
        setMouse(null)
        setHovered(null)
      }}
      className={
        vertical
          ? 'glass-dock relative flex w-[96px] flex-col items-center rounded-[40px] py-3'
          : 'glass-dock relative flex h-[100px] items-center rounded-[40px] px-3'
      }
    >
      {topics.map((t, i) => {
        const Icon = ICONS[t.code] ?? Landmark
        const size = sizeOf(i)
        const isActive = t.code === active
        return (
          <div
            key={t.code}
            onMouseEnter={() => setHovered(t.code)}
            style={
              vertical ? { marginBlock: GAP / 2 } : { marginInline: GAP / 2 }
            }
            className="relative flex items-center justify-center"
          >
            {hovered === t.code && (
              <span
                className={`glass-label pointer-events-none absolute whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.85rem] font-bold text-[#0B1A2A] ${
                  vertical ? 'right-full mr-4' : 'bottom-full mb-2'
                }`}
              >
                {t.label}
              </span>
            )}
            <Link
              to="/sujets/grille/$code"
              params={{ code: t.code }}
              viewTransition={slide}
              aria-label={t.label}
              aria-current={isActive ? 'page' : undefined}
              style={{ width: size, height: size }}
              className={`glass-bubble flex items-center justify-center rounded-full no-underline ${
                isActive ? 'glass-bubble-active text-white' : 'text-[#0B1A2A]'
              }`}
            >
              <Icon size={Math.round(size * 0.5)} strokeWidth={1.7} />
            </Link>
            <span
              // Le point du sujet ouvert, hors du flux : il ne décentre pas la
              // bulle.
              className={`absolute h-1 w-1 rounded-full ${vertical ? '-right-2.5' : '-bottom-2.5'} ${isActive ? 'bg-[#0B1A2A]' : 'bg-transparent'}`}
            />
          </div>
        )
      })}
    </div>
  )

  if (vertical)
    return (
      <nav
        aria-label="Sujets"
        className="fixed top-1/2 right-4 z-[20] -translate-y-1/2"
      >
        {dock}
      </nav>
    )
  return (
    <nav aria-label="Sujets" className="overflow-x-auto pt-10 pb-2">
      <div className="flex min-w-max justify-center">{dock}</div>
    </nav>
  )
}
