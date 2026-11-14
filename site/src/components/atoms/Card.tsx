import type { ReactNode } from 'react'

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`surface overflow-hidden ${className}`}>
      {title && (
        <header className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}
