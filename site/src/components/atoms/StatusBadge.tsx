type Tone = 'pending' | 'reviewed'

const TONES: Record<Tone, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  reviewed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
}

/** L'état de relecture d'une version, dit en toutes lettres. */
export function StatusBadge({
  tone,
  children,
}: {
  tone: Tone
  children: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
