import type { ReactNode } from 'react'

/** Le titre d'un écran, ce qu'on y fait, et son action principale. */
export function PageHeader({
  title,
  lead,
  action,
}: {
  title: string
  lead?: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {lead && <p className="max-w-2xl text-sm text-slate-500">{lead}</p>}
      </div>
      {action}
    </header>
  )
}
