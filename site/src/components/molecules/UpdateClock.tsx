import { useEffect, useState } from 'react'
import { getUpdates } from '../../services/public-api'
import type { Updates } from '../../types/public'

const pad = (n: number) => String(n).padStart(2, '0')

/** « 18 h 12 min 05 s », jusqu'à la prochaine collecte. */
function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h} h ${pad(m)} min ${pad(s % 60)} s`
}

/** « aujourd'hui à 06:02 », « hier à 06:02 », ou la date. */
function when(iso: string, now: Date): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const day = (x: Date) => x.toDateString()
  if (day(d) === day(now)) return `aujourd’hui à ${time}`
  if (day(d) === day(new Date(now.getTime() - 86_400_000)))
    return `hier à ${time}`
  return `le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${time}`
}

/**
 * La mise à jour automatique, en direct : l'heure locale du lecteur qui
 * défile, la dernière collecte et le temps qui reste avant la prochaine.
 * Rendue après le chargement, à l'heure du navigateur, pour que le serveur
 * et le lecteur ne se contredisent pas.
 */
export function UpdateClock() {
  const [updates, setUpdates] = useState<Updates | null>(null)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      getUpdates()
        .then((u) => alive && setUpdates(u))
        .catch(() => undefined)
    void load()
    setNow(new Date())
    const tick = setInterval(() => setNow(new Date()), 1000)
    // Relit l'état toutes les cinq minutes : une collecte finie s'affiche.
    const refresh = setInterval(() => void load(), 5 * 60_000)
    return () => {
      alive = false
      clearInterval(tick)
      clearInterval(refresh)
    }
  }, [])

  if (!now) return <div className="h-7" aria-hidden />
  const next = updates ? new Date(updates.nextRunAt) : null
  const failed = updates?.runs.filter((r) => r.ok === false) ?? []
  return (
    <div
      className="flex h-7 items-center gap-x-3 overflow-hidden text-[0.72rem] whitespace-nowrap text-slate-500 tabular-nums"
      aria-live="off"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-slate-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-slate-700" />
        </span>
        {now.toLocaleTimeString('fr-FR')}
      </span>
      <span className="hidden sm:inline">
        Mise à jour automatique chaque jour à{' '}
        {updates ? `${updates.schedule.hour} h` : '…'} (heure de Paris)
      </span>
      {updates?.lastRunAt && (
        <span className="hidden md:inline">
          · dernière {when(updates.lastRunAt, now)}
          {failed.length > 0
            ? ` (${failed.length} source${failed.length > 1 ? 's' : ''} en échec)`
            : ''}
        </span>
      )}
      {next && (
        <span>
          · prochaine dans {countdown(next.getTime() - now.getTime())}
        </span>
      )}
    </div>
  )
}
