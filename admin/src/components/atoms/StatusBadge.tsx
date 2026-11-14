/** Les statuts se lisent partout. Une variante ici plutôt qu'une couleur écrite à chaque usage. */
export type Tone = 'neutral' | 'ok' | 'warning' | 'critical' | 'muted'

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-50 text-slate-700 ring-slate-200',
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  critical: 'bg-red-50 text-red-700 ring-red-200',
  muted: 'bg-white text-slate-500 ring-slate-200',
}

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: Tone
  children: string
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
