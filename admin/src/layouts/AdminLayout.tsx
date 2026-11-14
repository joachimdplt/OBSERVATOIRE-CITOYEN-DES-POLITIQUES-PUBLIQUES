import { Link, Outlet } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { ROLE_LABELS } from '../data/labels'
import { can } from '../domain/roles'
import type { TeamMember } from '../types/session'

type Props = { member: TeamMember; onSignOut: () => void }

/**
 * L'administration : un bandeau sobre, qui est connecté, de quoi se
 * déconnecter, et l'écran en dessous.
 */
export function AdminLayout({ member, onSignOut }: Props) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/" className="font-semibold tracking-tight">
              Observatoire{' '}
              <span className="font-normal text-slate-400">
                · administration
              </span>
            </Link>
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="text-slate-600 hover:text-slate-900"
              activeProps={{ className: 'font-medium text-slate-900' }}
            >
              Catalogue
            </Link>
            {can(member.role, 'review') && (
              <Link
                to="/reviews"
                className="text-slate-600 hover:text-slate-900"
                activeProps={{ className: 'font-medium text-slate-900' }}
              >
                Relecture
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-right">
              <span className="block text-sm text-slate-800">
                {member.name}
              </span>
              <span className="block text-[11px] text-slate-400">
                {ROLE_LABELS[member.role]}
              </span>
            </span>
            <button
              type="button"
              onClick={onSignOut}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="text-slate-400 transition-colors hover:text-slate-900"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
