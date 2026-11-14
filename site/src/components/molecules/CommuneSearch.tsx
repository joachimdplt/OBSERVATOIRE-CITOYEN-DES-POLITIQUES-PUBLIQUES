import { useEffect, useId, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { searchTerritories } from '../../services/public-api'
import type { TerritoryMatch } from '../../services/public-api'

type Props = { onPick: (territory: TerritoryMatch) => void }

/**
 * Taper le nom de sa commune : les résultats s'ouvrent sous le champ, avec
 * le département pour distinguer les homonymes. Flèches, Entrée et Échap les
 * parcourent.
 */
export function CommuneSearch({ onPick }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TerritoryMatch[]>([])
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      searchTerritories({ data: { q: query } })
        .then((found) => {
          if (cancelled) return
          setResults(found ?? [])
          setCursor(0)
          setOpen(true)
        })
        .catch(() => !cancelled && setResults([]))
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const pick = (t: TerritoryMatch) => {
    onPick(t)
    setQuery('')
    setResults([])
    setOpen(false)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown')
      setCursor((c) => Math.min(results.length - 1, c + 1))
    else if (e.key === 'ArrowUp') setCursor((c) => Math.max(0, c - 1))
    else if (e.key === 'Enter' && results[cursor]) pick(results[cursor])
    else return
    e.preventDefault()
  }

  return (
    <div ref={root} className="relative">
      <label className="flex h-9 w-64 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 shadow-sm transition-colors focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-900/5 hover:border-slate-300">
        <Search size={15} className="shrink-0 text-slate-400" />
        <span className="sr-only">Chercher une commune</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKey}
          placeholder="Chercher une commune"
          role="combobox"
          aria-expanded={open}
          aria-controls={id}
          aria-autocomplete="list"
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </label>
      {open && query.trim().length >= 2 && (
        <ul
          id={id}
          role="listbox"
          aria-label="Communes"
          className="absolute top-full left-0 z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              Aucune commune de ce nom.
            </li>
          ) : (
            results.map((t, i) => (
              <li
                key={`${t.level}-${t.code}`}
                role="option"
                aria-selected={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(t)}
                className={`flex cursor-pointer items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                  i === cursor ? 'bg-slate-100' : ''
                }`}
              >
                <span className="text-slate-900">{t.name}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {t.departmentCode}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
