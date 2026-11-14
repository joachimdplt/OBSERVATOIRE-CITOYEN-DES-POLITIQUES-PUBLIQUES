type Props = {
  regions: { code: string; name: string }[]
  active?: string
  onPick: (region: string) => void
}

/**
 * Le choix de la région, pour un indicateur qui se compare dans sa région :
 * le zonage des médecins se décide région par région, une carte de France
 * mettrait côte à côte des classements qui ne se comparent pas.
 */
export function RegionPicker({ regions, active, onPick }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((r) => (
        <button
          key={r.code}
          type="button"
          onClick={() => onPick(r.code)}
          className={`h-8 rounded-full px-3 text-sm ${
            r.code === active
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          {r.name}
        </button>
      ))}
    </div>
  )
}
