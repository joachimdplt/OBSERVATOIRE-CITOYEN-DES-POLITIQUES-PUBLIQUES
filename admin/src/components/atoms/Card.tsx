import type { ReactNode } from 'react'

type Props = {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** Un cadre blanc, avec un titre et une action facultatifs. */
export function Card({ title, action, children, className = '' }: Props) {
  return (
    <section className={`surface overflow-hidden ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          {title && (
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          )}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}
