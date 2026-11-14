import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  ChevronRight,
  Code2,
  Flag,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Leaf,
  Palette,
  Scale,
  ShieldCheck,
  TrainFront,
  Wheat,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Highlight } from '../../atoms/Highlight'
import { PILLARS } from '../../../data/pillars'
import { HOME } from '../../../data/home'
import type { Pillar, PublicationLine } from '../../../types/public'

/*
 * L'accueil dans le langage d'airobotics (ouverture centrée, écrans pleins,
 * titres Inter 800 avec un passage surligné, pastilles, grands arrondis,
 * dernier écran sombre), et dans l'ordre du cahier des charges : le principe
 * directeur et les articles publiés, les douze piliers, la contribution. Monochrome : aucune couleur ne
 * rappelle un parti.
 */

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

/** Un écran entier, contenu centré ; l'ouverture retire la hauteur de l'en-tête. */
function Screen({
  children,
  first = false,
  className = '',
  id,
}: {
  children: ReactNode
  first?: boolean
  className?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className={`flex scroll-mt-14 items-center px-6 py-24 md:px-10 ${
        first ? 'min-h-[calc(100svh-3.5rem)]' : 'min-h-svh'
      } ${className}`}
    >
      <div className="mx-auto w-full max-w-[1080px]">{children}</div>
    </section>
  )
}

/** Le titre d'un écran et sa phrase, centrés. */
function Step({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">
      <h2
        className={`${DISPLAY} text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.15] text-balance`}
      >
        <Highlight text={title} />
      </h2>
      {lead && (
        <p
          className={`mt-5 max-w-[52ch] text-[1.08rem] leading-relaxed md:text-[1.2rem] ${MUTED}`}
        >
          {lead}
        </p>
      )}
    </div>
  )
}

/** L'action de la page : une pastille pleine, navy sur clair, blanche sur sombre. */
function ActionPill({
  label,
  dark = false,
  slug,
}: {
  label: string
  dark?: boolean
  /** Un enjeu publié à ouvrir ; la carte sinon. */
  slug?: string
}) {
  const target = slug
    ? ({ to: '/enjeux/$slug', params: { slug } } as const)
    : ({ to: '/carte' } as const)
  return (
    <Link
      {...target}
      className={`inline-flex h-14 items-center gap-3 rounded-full px-7 text-[1.05rem] font-extrabold no-underline transition-opacity hover:opacity-90 ${
        dark ? 'bg-white text-[#0B1A2A]' : 'bg-[#0B1A2A] text-white'
      }`}
    >
      {label}
      <ArrowRight size={18} strokeWidth={2.75} aria-hidden />
    </Link>
  )
}

/** Une icône grasse dans un rond plein ; pâle pour ce qui est à venir. */
function Bubble({
  icon: Icon,
  size = 48,
  muted = false,
}: {
  icon: LucideIcon
  size?: number
  muted?: boolean
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${
        muted ? 'bg-[#0B1A2A]/8 text-[#0B1A2A]/45' : 'bg-[#0B1A2A] text-white'
      }`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={2.5} aria-hidden />
    </span>
  )
}

const PILLAR_ICONS: Record<Pillar, LucideIcon> = {
  agriculture_food: Wheat,
  health: HeartPulse,
  education_research: GraduationCap,
  energy: Zap,
  housing: House,
  transport_infrastructure: TrainFront,
  labour_economy_industry: Briefcase,
  social_protection: HandHeart,
  security_justice_defence: Scale,
  environment_resources: Leaf,
  institutions_public_services: Landmark,
  culture_sports_associations: Palette,
}

/** Les douze piliers du cahier des charges ; chacun mène à ses enjeux publiés. */
export function HomePiliers({
  publications,
}: {
  publications: PublicationLine[]
}) {
  const { piliers } = HOME
  return (
    <Screen className="bg-[#F4F6F8]">
      <Step title={piliers.title} lead={piliers.lead} />
      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p) => {
          const own = publications.filter((x) => x.pillar === p.id)
          const open = own.length > 0
          return (
            <li
              key={p.id}
              className={`flex h-full flex-col rounded-[24px] p-5 ${
                open
                  ? 'bg-white shadow-[0_0_0_1px_rgba(11,26,42,0.1)]'
                  : 'bg-white/60'
              }`}
            >
              <Bubble icon={PILLAR_ICONS[p.id]} muted={!open} />
              <p
                className={`mt-4 text-[1.05rem] leading-snug font-extrabold ${
                  open ? 'text-[#0B1A2A]' : 'text-[#0B1A2A]/50'
                }`}
              >
                {p.label}
              </p>
              {open ? (
                <ul className="mt-2 space-y-1">
                  {own.map((x) => (
                    <li key={x.slug}>
                      <Link
                        to="/enjeux/$slug"
                        params={{ slug: x.slug }}
                        className="inline-flex items-center gap-1 text-[0.9rem] font-bold text-[#0B1A2A] no-underline hover:underline"
                      >
                        {x.title} <ChevronRight size={14} strokeWidth={2.75} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`mt-1 text-[0.88rem] ${MUTED}`}>{piliers.soon}</p>
              )}
            </li>
          )
        })}
      </ul>
    </Screen>
  )
}

const WAY_ICONS = [Flag, BookOpen, ShieldCheck, Code2]

export function HomeContribuer() {
  const { contribuer } = HOME
  return (
    <Screen id="contribuer" className="bg-white">
      <Step title={contribuer.title} lead={contribuer.lead} />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {contribuer.ways.map((way, i) => (
          <a
            key={way.title}
            href={way.href}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col rounded-[28px] bg-white p-6 no-underline shadow-[0_0_0_1px_rgba(11,26,42,0.1)] transition-shadow hover:shadow-[0_0_0_1px_rgba(11,26,42,0.3)]"
          >
            <Bubble icon={WAY_ICONS[i]} />
            <p className={`${DISPLAY} mt-5 text-[1.2rem]`}>{way.title}</p>
            <p className={`mt-2 flex-1 text-[0.95rem] leading-snug ${MUTED}`}>
              {way.text}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-[0.95rem] font-extrabold text-[#0B1A2A]">
              <span className="flex size-7 items-center justify-center rounded-full bg-[#0B1A2A] text-white">
                <ArrowUpRight size={14} strokeWidth={3} />
              </span>
              {way.action}
            </span>
          </a>
        ))}
      </div>
    </Screen>
  )
}

/** Le dernier écran, sombre : la même action qu'à l'ouverture. */
export function HomeFin() {
  const { fin } = HOME
  return (
    <Screen className="bg-[#0B1A2A] text-white">
      <div className="flex flex-col items-center text-center">
        <h2 className="text-[clamp(2.4rem,6vw,4.8rem)] leading-[1.04] font-extrabold tracking-[-0.04em] text-balance">
          {fin.title}
        </h2>
        <p className="mt-6 max-w-[52ch] text-[1.05rem] leading-relaxed text-white/70">
          {fin.lead}
        </p>
        <div className="mt-10">
          <ActionPill label={fin.cta} dark />
        </div>
      </div>
    </Screen>
  )
}
