import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { MapValue } from '../domain/classes'
import type {
  TerritoryValues,
  IndicatorLine,
  IndicatorSheet,
} from '../types/public'

/**
 * La lecture de l'API publique, toujours côté serveur : la page arrive
 * rendue, et l'adresse de l'API ne sort pas du serveur.
 */
const API = process.env.API_ORIGIN ?? 'http://localhost:3001'

/** Au-delà, la page dit que les données sont indisponibles plutôt que d'attendre. */
const TIMEOUT_MS = 5000

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}/api/public${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`API publique : ${res.status} sur ${path}`)
  return (await res.json()) as T
}

export const listIndicators = createServerFn({ method: 'GET' })
  .validator(z.object({ pillar: z.string().optional() }))
  .handler(({ data }) =>
    get<IndicatorLine[]>(
      `/indicators${data.pillar ? `?pillar=${encodeURIComponent(data.pillar)}` : ''}`,
    ),
  )

export const getIndicator = createServerFn({ method: 'GET' })
  .validator(z.object({ code: z.string() }))
  .handler(({ data }) =>
    get<IndicatorSheet>(`/indicators/${encodeURIComponent(data.code)}`),
  )

/** Toutes les valeurs d'une période, pour la carte : une ligne [code, valeur, statut] par territoire. */
export const getIndicatorMap = createServerFn({ method: 'GET' })
  .validator(z.object({ code: z.string(), period: z.string() }))
  .handler(({ data }) =>
    get<{ period: string; values: MapValue[] }>(
      `/indicators/${encodeURIComponent(data.code)}/map?period=${encodeURIComponent(data.period)}`,
    ),
  )

/** Toutes les couches publiées pour un territoire, à la commune cliquée. */
export const getTerritoryValues = createServerFn({ method: 'GET' })
  .validator(z.object({ level: z.string(), code: z.string() }))
  .handler(({ data }) =>
    get<TerritoryValues>(
      `/territories/${encodeURIComponent(data.level)}/${encodeURIComponent(data.code)}/values`,
    ),
  )
