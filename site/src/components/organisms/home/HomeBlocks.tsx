import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  ChevronRight,
  Code2,
  Columns2,
  FileText,
  Flag,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Leaf,
  Map,
  Palette,
  Quote,
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
import type { IndicatorLine, Pillar } from '../../../types/public'

/*
 * L'accueil dans le langage d'airobotics (ouverture centrée, écrans pleins,
 * titres Inter 800 avec un passage surligné, pastilles, grands arrondis,
 * dernier écran sombre), et dans l'ordre du cahier des charges : le principe
 * directeur, les douze piliers, le parcours de référence, les
 * fonctionnalités, la contribution. Monochrome : aucune couleur ne
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
}: {
  label: string
  dark?: boolean
}) {
  return (
    <Link
      to="/carte"
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

/** « En ligne » ou « À venir », sans couleur de statut. */
function Status({ soon }: { soon: boolean }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-[0.75rem] font-bold ${
        soon
          ? 'text-[#5B6470] ring-1 ring-[#0B1A2A]/15'
          : 'bg-[#0B1A2A] text-white'
      }`}
    >
      {soon ? 'À venir' : 'En ligne'}
    </span>
  )
}

export function HomeHero() {
  const { hero } = HOME
  return (
    <Screen first className="bg-white">
      <div className="mx-auto flex max-w-[1080px] flex-col items-center text-center">
        <h1
          className={`${DISPLAY} text-[clamp(2.4rem,5.6vw,4.4rem)] leading-[1.08] whitespace-pre-line`}
        >
          <Highlight text={hero.title} />
        </h1>
        <p
          className={`mt-7 max-w-[46ch] text-[1.15rem] leading-relaxed md:text-[1.3rem] ${MUTED}`}
        >
          {hero.lead}
        </p>
        <div className="mt-10">
          <ActionPill label={hero.cta} />
        </div>
      </div>
    </Screen>
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

/** Les douze piliers du cahier des charges ; ceux qui ont des indicateurs publiés s'ouvrent. */
export function HomePiliers({ indicators }: { indicators: IndicatorLine[] }) {
  const { piliers } = HOME
  return (
    <Screen className="bg-[#F4F6F8]">
      <Step title={piliers.title} lead={piliers.lead} />
      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p) => {
          const count = indicators.filter((i) => i.pillar === p.id).length
          const content = (
            <>
              <Bubble icon={PILLAR_ICONS[p.id]} muted={count === 0} />
              <p
                className={`mt-4 text-[1.05rem] leading-snug font-extrabold ${
                  count === 0 ? 'text-[#0B1A2A]/50' : 'text-[#0B1A2A]'
                }`}
              >
                {p.label}
              </p>
              <p className={`mt-1 text-[0.88rem] ${MUTED}`}>
                {count > 0 ? piliers.online(count) : piliers.soon}
              </p>
            </>
          )
          return (
            <li key={p.id}>
              {count > 0 ? (
                <Link
                  to="/pillars/$pillar"
                  params={{ pillar: p.id }}
                  className="flex h-full flex-col rounded-[24px] bg-white p-5 no-underline shadow-[0_0_0_1px_rgba(11,26,42,0.1)] transition-shadow hover:shadow-[0_0_0_1px_rgba(11,26,42,0.35)]"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex h-full flex-col rounded-[24px] bg-white/60 p-5">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Screen>
  )
}

/** Le parcours de référence du cahier des charges, étape par étape. */
export function HomeParcours() {
  const { parcours } = HOME
  return (
    <Screen className="bg-white">
      <Step title={parcours.title} lead={parcours.lead} />
      <ol className="mx-auto mt-14 flex max-w-[980px] flex-wrap items-center justify-center gap-x-2 gap-y-3">
        {parcours.steps.map((step, i) => (
          <li key={step.label} className="flex items-center gap-2">
            <span
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2 text-[1rem] font-bold ${
                step.soon
                  ? 'text-[#5B6470] ring-1 ring-[#0B1A2A]/15'
                  : 'bg-[#0B1A2A] text-white'
              }`}
            >
              {step.label}
              {step.soon && (
                <span className="text-[0.75rem] font-semibold">· à venir</span>
              )}
            </span>
            {i < parcours.steps.length - 1 && (
              <ChevronRight
                size={20}
                strokeWidth={2.5}
                className="text-[#0B1A2A]/40"
                aria-hidden
              />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-10 flex justify-center">
        <ActionPill label={parcours.cta} />
      </div>
    </Screen>
  )
}

const FICHE_ICONS = [FileText, Map, Quote, Columns2]

/** Les fonctionnalités publiques du cahier des charges, en ligne ou à venir. */
export function HomeFiches() {
  const { fiches } = HOME
  return (
    <Screen className="bg-[#F4F6F8]">
      <Step title={fiches.title} />
      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {fiches.items.map((item, i) => (
          <div
            key={item.title}
            className="flex gap-5 rounded-[28px] bg-white p-6 shadow-[0_0_0_1px_rgba(11,26,42,0.1)] md:p-8"
          >
            <Bubble icon={FICHE_ICONS[i]} muted={item.soon} />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p className={`${DISPLAY} text-[1.3rem]`}>{item.title}</p>
                <Status soon={item.soon} />
              </div>
              <p className={`text-[1rem] leading-relaxed ${MUTED}`}>
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
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
