import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/**
 * Le cadre de chaque page publique. Le pied de page donne les licences et
 * la licence des contenus et celle du code.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-4 px-6 py-2">
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
            <Link to="/enjeux" className="hover:text-slate-900">
              Enjeux
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
      </header>
      <div className="flex-1">{children}</div>
      {/* Le pied de page navy, comme le dernier écran de l'accueil : une page
          claire se ferme sur du sombre. */}
      <footer className="border-t border-white/10 bg-[#0B1A2A]">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-6 py-6 text-xs text-white/60">
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
