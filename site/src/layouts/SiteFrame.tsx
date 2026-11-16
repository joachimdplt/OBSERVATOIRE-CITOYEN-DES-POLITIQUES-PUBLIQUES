import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { UpdateClock } from '../components/molecules/UpdateClock'

const LINKS = [
  { to: '/sujets', label: 'Sujets' },
  { to: '/contribuer', label: 'Contribuer' },
  { to: '/sources', label: 'Sources' },
  { to: '/developpeurs', label: 'Développeurs' },
] as const

/**
 * Le cadre de chaque page publique : l'en-tête et l'horloge de la mise à
 * jour automatique ; le pied de page donne la licence des contenus et celle
 * du code.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* La navigation : une barre de verre qui flotte, les liens en
          bulles ; la page ouverte est la bulle sombre. La hauteur totale
          reste celle d'avant (86 px), sur laquelle les pages se calent. */}
      <header className="sticky top-0 z-10 bg-gradient-to-b from-[#F4F6F8]/95 to-[#F4F6F8]/60 px-3 pt-2 backdrop-blur-sm md:px-6">
        <div className="glass-nav mx-auto flex h-12 max-w-[1280px] items-center gap-2 rounded-full pr-1.5 pl-1.5">
          <Link
            to="/"
            className="glass-nav-brand flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-extrabold tracking-tight text-white no-underline"
          >
            Observatoire citoyen
          </Link>
          <nav className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto text-sm font-semibold">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="nav-pill"
                activeProps={{ className: 'nav-pill nav-pill-active' }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mx-auto max-w-[1280px] px-4">
          <UpdateClock />
        </div>
      </header>
      <div className="flex-1">{children}</div>
      {/* Le pied de page navy, comme le dernier écran de l'accueil : une page
          claire se ferme sur du sombre. */}
      <footer className="border-t border-white/10 bg-[#0B1A2A]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-3 px-6 py-6 text-xs text-white/60">
          <span>
            Contenus sous{' '}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr"
              className="underline"
            >
              CC BY-NC-SA 4.0
            </a>
            , pas d’usage commercial sans accord. Les données gardent la licence
            de leur producteur.
          </span>
          <span>Code : tous droits réservés.</span>
        </div>
      </footer>
    </div>
  )
}
