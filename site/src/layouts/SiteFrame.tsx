import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { UpdateClock } from '../components/molecules/UpdateClock'

/**
 * Le cadre de chaque page publique : l'en-tête et l'horloge de la mise à
 * jour automatique ; le pied de page donne la licence des contenus et celle
 * du code.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-[#0B1A2A]/8 bg-[#F4F6F8]/80 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-[1280px] items-center justify-between gap-4 px-6 py-2">
          <Link
            to="/"
            className="shrink-0 text-sm font-semibold tracking-tight"
          >
            Observatoire citoyen
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-sm text-slate-600">
            <Link to="/" className="hover:text-slate-900">
              Articles
            </Link>
            <Link to="/sujets" className="hover:text-slate-900">
              Sujets
            </Link>
            <Link to="/carte" className="hover:text-slate-900">
              Carte
            </Link>
            <Link to="/" hash="contribuer" className="hover:text-slate-900">
              Contribuer
            </Link>
            <Link to="/developpeurs" className="hover:text-slate-900">
              Développeurs
            </Link>
          </nav>
        </div>
        <div className="border-t border-[#0B1A2A]/5">
          <div className="mx-auto max-w-[1280px] px-6">
            <UpdateClock />
          </div>
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
