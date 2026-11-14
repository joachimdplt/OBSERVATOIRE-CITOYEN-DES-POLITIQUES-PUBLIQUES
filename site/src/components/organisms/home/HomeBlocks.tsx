import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ArrowUpRight,
  Binary,
  BookOpen,
  Code2,
  FileSearch,
  Flag,
  HelpCircle,
  Quote,
  Search,
  ShieldCheck,
  Split,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Highlight, plain } from '../../atoms/Highlight'
import { HOME } from '../../../data/home'

/*
 * L'accueil dans le langage d'airobotics : une ouverture centrée, puis un
 * raisonnement en écrans (le constat, la réponse, les garanties, la
 * contribution) qui mène à une seule action, chercher sa commune. Titres
 * Inter 800 serrés, un passage surligné, pastilles, grands arrondis.
 * Monochrome : aucune couleur ne rappelle un parti.
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

/** Le titre d'une étape et sa phrase, centrés. */
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
function SearchPill({
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
      <Search size={20} strokeWidth={2.75} aria-hidden />
      {label}
      <ArrowRight size={18} strokeWidth={2.75} aria-hidden />
    </Link>
  )
}

/** Une icône grasse dans un rond plein. */
function Bubble({
  icon: Icon,
  size = 48,
  inverse = false,
}: {
  icon: LucideIcon
  size?: number
  inverse?: boolean
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${
        inverse ? 'bg-white text-[#0B1A2A]' : 'bg-[#0B1A2A] text-white'
      }`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={2.5} aria-hidden />
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
          className={`mt-7 max-w-[44ch] text-[1.15rem] leading-relaxed md:text-[1.3rem] ${MUTED}`}
        >
          {hero.lead}
        </p>
        <div className="mt-10">
          <SearchPill label={hero.cta} />
        </div>
      </div>
    </Screen>
  )
}

const CONSTAT_ICONS = [Binary, Split]

export function HomeConstat() {
  const { constat } = HOME
  return (
    <Screen className="bg-[#F4F6F8]">
      <Step title={constat.title} lead={constat.lead} />
      <div className="mt-14 grid items-center gap-10 rounded-[28px] bg-[#0B1A2A] p-8 text-white md:p-14 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-3">
          <span className="text-[18px] font-bold text-white/70">
            {constat.accroche}
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 [--n:clamp(64px,8vw,120px)]">
            <strong className="text-[length:var(--n)] leading-[0.8] font-extrabold tracking-[-0.04em] tabular-nums">
              {constat.valeur}
            </strong>
            <span className="text-[calc(var(--n)*0.2)] leading-[1.2] font-bold whitespace-pre-line">
              {constat.legende}
            </span>
          </div>
        </div>
        <ul className="flex flex-col gap-7">
          {constat.points.map((point, i) => (
            <li key={point.title} className="flex items-start gap-4">
              <Bubble icon={CONSTAT_ICONS[i]} inverse />
              <span>
                <p className="text-[1.15rem] font-extrabold">{point.title}</p>
                <p className="mt-1 text-[1rem] leading-relaxed text-white/70">
                  {point.text}
                </p>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  )
}

const REPONSE_ICONS = [HelpCircle, Quote, FileSearch]

export function HomeReponse() {
  const { reponse } = HOME
  return (
    <Screen className="bg-white">
      <Step title={reponse.title} lead={reponse.lead} />
      <ol className="mt-16 grid gap-12 md:grid-cols-3">
        {reponse.items.map((item, i) => (
          <li
            key={item.title}
            className="flex flex-col items-center text-center"
          >
            <Bubble icon={REPONSE_ICONS[i]} size={112} />
            <p className={`${DISPLAY} mt-6 text-[1.55rem]`}>{item.title}</p>
            <p
              className={`mt-3 max-w-[30ch] text-[1rem] leading-relaxed ${MUTED}`}
            >
              {item.text}
            </p>
          </li>
        ))}
      </ol>
    </Screen>
  )
}

export function HomeRegles() {
  const { regles } = HOME
  return (
    <Screen className="bg-[#F4F6F8]">
      <Step title={regles.title} lead={regles.lead} />
      <ul className="mx-auto mt-14 max-w-[760px]">
        {regles.items.map((rule) => (
          <li
            key={rule.label}
            className="flex flex-col gap-1 border-b border-[#0B1A2A]/10 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
          >
            <span className="text-[1.05rem] font-extrabold text-[#0B1A2A]">
              {rule.label}
            </span>
            <span className={`text-[1.05rem] sm:text-right ${MUTED}`}>
              {rule.text}
            </span>
          </li>
        ))}
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
        <h2 className="text-[clamp(2.6rem,7vw,5.6rem)] leading-[1.02] font-extrabold tracking-[-0.04em] text-balance">
          {plain(fin.title)}
        </h2>
        <p className="mt-6 max-w-[48ch] text-[1.05rem] leading-relaxed text-white/70">
          {fin.lead}
        </p>
        <div className="mt-10">
          <SearchPill label={fin.cta} dark />
        </div>
      </div>
    </Screen>
  )
}
