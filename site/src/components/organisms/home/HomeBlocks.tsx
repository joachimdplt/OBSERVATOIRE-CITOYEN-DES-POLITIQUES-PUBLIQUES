import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, KeyRound, Flag, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Highlight } from '../../atoms/Highlight'
import { HOME } from '../../../data/home'

/*
 * L'accueil dans le langage d'airobotics (ouverture centrée, écrans pleins,
 * titres Inter 800 avec un passage surligné, pastilles, grands arrondis,
 * dernier écran sombre). Monochrome : aucune couleur ne rappelle un parti.
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
      <div className="mx-auto w-full max-w-[1280px]">{children}</div>
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
    ? ({ to: '/sujets/$slug', params: { slug } } as const)
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

const WAY_ICONS = [Flag, BookOpen, ShieldCheck, KeyRound]

/** Les façons de contribuer, qui passeront par l'espace membre. */
export function HomeContribuer() {
  const { contribuer } = HOME
  return (
    <Screen id="contribuer">
      <Step title={contribuer.title} lead={contribuer.lead} />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {contribuer.ways.map((way, i) => (
          <div
            key={way.title}
            className="flex flex-col rounded-[28px] bg-white p-6"
          >
            <Bubble icon={WAY_ICONS[i]} />
            <p className={`${DISPLAY} mt-5 text-[1.2rem]`}>{way.title}</p>
            <p className={`mt-2 flex-1 text-[0.95rem] leading-snug ${MUTED}`}>
              {way.text}
            </p>
            <span className="mt-5 text-[0.85rem] font-bold text-[#5B6470]">
              {contribuer.soon}
            </span>
          </div>
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
