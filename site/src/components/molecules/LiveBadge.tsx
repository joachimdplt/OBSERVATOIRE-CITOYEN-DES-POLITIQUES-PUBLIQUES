import { useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

/** L'intervalle de relecture d'une page en direct. */
const EVERY_MS = 60_000

/**
 * Une page en direct : ses données se relisent toutes les minutes et au
 * retour sur l'onglet, sans recharger la page ; la pastille dit l'heure de la
 * dernière relecture.
 */
export function LiveBadge() {
  const router = useRouter()
  const [at, setAt] = useState<Date | null>(null)

  useEffect(() => {
    setAt(new Date())
    const refresh = () => void router.invalidate().then(() => setAt(new Date()))
    const id = setInterval(refresh, EVERY_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router])

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#F4F6F8] px-3 py-1 text-[0.78rem] font-semibold text-[#0B1A2A] tabular-nums">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0B1A2A]/40" />
        <span className="relative inline-flex size-2 rounded-full bg-[#0B1A2A]" />
      </span>
      En direct
      {at && (
        <span className="font-normal text-[#5B6470]">
          · à jour à {at.toLocaleTimeString('fr-FR')}
        </span>
      )}
    </span>
  )
}
