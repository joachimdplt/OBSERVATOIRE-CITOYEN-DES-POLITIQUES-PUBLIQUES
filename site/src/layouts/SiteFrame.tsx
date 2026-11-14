import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { SOURCE_CODE } from '../data/project'

/**
 * Le cadre de chaque page publique. Le pied de page donne les licences et
 * l'adresse du code source, comme l'AGPL le demande à un service en ligne.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Observatoire citoyen
          </Link>
          <nav className="flex items-center gap-5 text-sm text-slate-600">
            <Link to="/carte" className="hover:text-slate-900">
              Carte
            </Link>
            <Link to="/" hash="indicateurs" className="hover:text-slate-900">
              Indicateurs
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-6 py-6 text-xs text-slate-500">
          <span>
            Contenu sous{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr"
              className="underline"
            >
              CC BY-SA 4.0
            </a>
            . Les données gardent la licence de leur producteur.
          </span>
          <a href={SOURCE_CODE} className="underline">
            Code source (AGPL-3.0)
          </a>
        </div>
      </footer>
    </div>
  )
}
