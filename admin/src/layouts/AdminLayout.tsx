import { Link, Outlet } from '@tanstack/react-router'
import { LogOut, Settings2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { can } from '../domain/roles'
import type { Role, TeamMember } from '../types/session'

type Props = { member: TeamMember; onSignOut: () => void }

type NavLink = {
  to:
    | '/'
    | '/publications'
    | '/reviews'
    | '/verification'
    | '/subjects'
    | '/mesure'
  label: string
  exact?: boolean
  /** La capacité qu'il faut pour voir ce lien. */
  needs?: Parameters<typeof can>[1]
}

/**
 * La navigation, rangée par travail : le rangement des programmes, les
 * publications, les données. Un nom par écran, sans doublon.
 */
const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Rangement',
    links: [
      { to: '/verification', label: 'Vérification' },
      { to: '/subjects', label: 'À trancher' },
      { to: '/mesure', label: 'Mesure' },
    ],
  },
  {
    title: 'Publications',
    links: [
      { to: '/publications', label: 'Publications' },
      { to: '/reviews', label: 'Relecture', needs: 'review' },
    ],
  },
  {
    title: 'Données',
    links: [{ to: '/', label: 'Catalogue', exact: true }],
  },
]

const visible = (role: Role, link: NavLink) =>
  !link.needs || can(role, link.needs)

/**
 * L'administration, dans le même verre liquide que le site public : un
 * menu de verre à gauche, les écrans rangés par groupe, la page ouverte en
 * bulle sombre, et les réglages en bas.
 */
export function AdminLayout({ member, onSignOut }: Props) {
  return (
    <div className="min-h-dvh md:pl-[248px]">
      <aside className="glass z-10 flex flex-col gap-1 rounded-[28px] p-3 md:fixed md:top-3 md:bottom-3 md:left-3 md:w-[224px] max-md:m-3">
        <Link
          to="/"
          className="glass-nav-brand mb-3 flex h-10 items-center rounded-full px-4 text-sm font-extrabold tracking-tight text-white no-underline"
        >
          Observatoire
        </Link>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto text-sm font-semibold">
          {GROUPS.map((g) => {
            const links = g.links.filter((l) => visible(member.role, l))
            if (links.length === 0) return null
            return (
              <div key={g.title} className="flex flex-col gap-0.5">
                <p className="px-3 pb-1 text-xs font-bold text-[#5B6470]">
                  {g.title}
                </p>
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    activeOptions={{ exact: l.exact ?? false }}
                    className="nav-pill w-full"
                    activeProps={{
                      className: 'nav-pill nav-pill-active w-full',
                    }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )
          })}
        </nav>
        <Settings name={member.name} onSignOut={onSignOut} />
      </aside>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Les réglages : une bulle qui ouvre un petit menu de verre, avec la
 * personne connectée et de quoi se déconnecter. Un clic ailleurs ou Échap
 * le referme.
 */
function Settings({
  name,
  onSignOut,
}: {
  name: string
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !box.current?.contains(e.target as Node)
      )
        setOpen(false)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`nav-pill w-full gap-1.5 ${open ? 'nav-pill-active' : ''}`}
      >
        <Settings2 size={15} />
        Réglages
      </button>
      {open && (
        <div className="glass absolute bottom-full left-0 mb-2 w-full rounded-[18px] p-1.5 text-sm">
          <p className="px-3 py-2 text-[#5B6470]">
            Connecté :{' '}
            <span className="font-semibold text-[#0B1A2A]">{name}</span>
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="nav-pill w-full justify-start gap-2"
          >
            <LogOut size={15} /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
