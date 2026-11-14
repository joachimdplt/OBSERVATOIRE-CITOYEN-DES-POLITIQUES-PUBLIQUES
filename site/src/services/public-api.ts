import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  IndicatorLine,
  IndicatorSheet,
  ObservationPage,
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

export const listObservations = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      code: z.string(),
      territory: z.string().optional(),
      period: z.string().optional(),
      offset: z.number().int().min(0).default(0),
    }),
  )
  .handler(({ data }) => {
    const query = new URLSearchParams({
      limit: '50',
      offset: String(data.offset),
    })
    if (data.territory) query.set('territory', data.territory)
    if (data.period) query.set('period', data.period)
    return get<ObservationPage>(
      `/indicators/${encodeURIComponent(data.code)}/observations?${query}`,
    )
  })
