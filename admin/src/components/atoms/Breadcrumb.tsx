import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; to?: string }

/** Où l'on se trouve, et par où revenir. */
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
      {crumbs.map((c, i) => (
        <li key={`${c.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={13} className="text-slate-300" />}
          {c.to && i < crumbs.length - 1 ? (
            <Link to={c.to} className="hover:text-slate-900 hover:underline">
              {c.label}
            </Link>
          ) : (
            <span className="text-slate-900">{c.label}</span>
          )}
        </li>
      ))}
    </ol>
  )
}
