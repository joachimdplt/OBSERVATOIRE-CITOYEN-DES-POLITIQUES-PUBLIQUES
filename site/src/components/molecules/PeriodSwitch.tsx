type Props = {
  periods: string[]
  active: string
  onPick: (period: string) => void
}

/** Les années disponibles, en un seul interrupteur : une seule se lit à la fois. */
export function PeriodSwitch({ periods, active, onPick }: Props) {
  if (periods.length === 1)
    return (
      <span className="inline-flex h-9 items-center rounded-full bg-slate-100 px-4 text-sm font-medium text-slate-700">
        {periods[0]}
      </span>
    )
  return (
    <div
      role="radiogroup"
      aria-label="Année"
      className="inline-flex h-9 items-center rounded-full bg-slate-100 p-1"
    >
      {periods.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={p === active}
          onClick={() => onPick(p)}
          className={`h-7 rounded-full px-3.5 text-sm font-medium transition-all ${
            p === active
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
