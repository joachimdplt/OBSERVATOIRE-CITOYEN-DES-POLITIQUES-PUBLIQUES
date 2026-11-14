import type { ReactNode } from 'react'

/** Un terme et ce qu'il dit, dans une fiche. */
export function Term({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed text-slate-800">{children}</dd>
    </div>
  )
}
