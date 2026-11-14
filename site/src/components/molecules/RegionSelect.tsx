import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type Props = {
  regions: { code: string; name: string }[]
  active?: string
  onPick: (region: string) => void
}

/**
 * Le choix de la région, pour un indicateur qui se compare dans sa région :
 * le zonage des médecins se décide région par région, une carte de France
 * mettrait côte à côte des classements qui ne se comparent pas. La liste
 * s'ouvre sous le bouton ; flèches, Entrée et Échap la parcourent.
 */
export function RegionSelect({ regions, active, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const id = useId()
  const current = regions.find((r) => r.code === active)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (open)
      list.current
        ?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
        ?.scrollIntoView({ block: 'nearest' })
  }, [open, cursor])

  const show = () => {
    setCursor(
      Math.max(
        0,
        regions.findIndex((r) => r.code === active),
      ),
    )
    setOpen(true)
  }
  const pick = (code: string) => {
    onPick(code)
    setOpen(false)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        show()
      }
      return
    }
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown')
      setCursor((c) => Math.min(regions.length - 1, c + 1))
    else if (e.key === 'ArrowUp') setCursor((c) => Math.max(0, c - 1))
    else if (e.key === 'Enter') pick(regions[cursor].code)
    else return
    e.preventDefault()
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
        className={`inline-flex h-9 min-w-56 items-center justify-between gap-3 rounded-full border bg-white pr-3 pl-4 text-sm font-medium shadow-sm transition-colors focus:ring-4 focus:ring-slate-900/5 focus:outline-none ${
          open ? 'border-slate-400' : 'border-slate-200 hover:border-slate-300'
        } ${current ? 'text-slate-900' : 'text-slate-500'}`}
      >
        {current?.name ?? 'Choisir une région'}
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul
          ref={list}
          id={id}
          role="listbox"
          aria-label="Région"
          className="absolute top-full left-0 z-20 mt-2 max-h-80 w-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10"
        >
          {regions.map((r, i) => (
            <li
              key={r.code}
              role="option"
              aria-selected={r.code === active}
              data-index={i}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r.code)}
              className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm ${
                i === cursor ? 'bg-slate-100' : ''
              } ${r.code === active ? 'font-medium text-slate-900' : 'text-slate-700'}`}
            >
              {r.name}
              {r.code === active && (
                <Check size={15} className="text-slate-900" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
