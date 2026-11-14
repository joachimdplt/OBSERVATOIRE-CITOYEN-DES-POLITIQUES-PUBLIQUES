import { useEffect, useState } from 'react'
import type { MapValue } from '../domain/classes'
import { getIndicatorMap } from '../services/public-api'

/**
 * Les valeurs d'une période pour la carte, lues dans le navigateur : une
 * réponse d'un mégaoctet n'a rien à faire dans la page rendue par le serveur.
 */
export function useIndicatorMap(
  code: string,
  period: string,
  region?: string,
  /** Faux : rien à lire tant que la région n'est pas choisie. */
  enabled = true,
) {
  const [values, setValues] = useState<MapValue[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setValues(null)
    setFailed(false)
    if (!enabled) return
    getIndicatorMap({ data: { code, period, region } })
      .then((map) => !cancelled && setValues(map?.values ?? []))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [code, period, region, enabled])
  return { values, failed }
}
