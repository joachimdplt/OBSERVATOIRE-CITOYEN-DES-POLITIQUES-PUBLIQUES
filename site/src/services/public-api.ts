import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { MapValue } from '../domain/classes'
import type {
  ElectionSheet,
  LiveValues,
  PublicationLine,
  PublicationSheet,
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
  .validator(
    z.object({
      code: z.string(),
      period: z.string(),
      region: z.string().optional(),
    }),
  )
  .handler(({ data }) =>
    get<{ period: string; values: MapValue[] }>(
      `/indicators/${encodeURIComponent(data.code)}/map?period=${encodeURIComponent(data.period)}${
        data.region ? `&region=${encodeURIComponent(data.region)}` : ''
      }`,
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

/** Une commune ou un arrondissement trouvé par son nom. */
export type TerritoryMatch = {
  code: string
  name: string
  level: 'commune' | 'municipal_district'
  departmentCode: string | null
  regionCode: string | null
}

/** Les communes dont le nom commence par la saisie, puis celles qui la contiennent. */
export const searchTerritories = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().min(2) }))
  .handler(({ data }) =>
    get<TerritoryMatch[]>(`/territories?q=${encodeURIComponent(data.q)}`),
  )

/** Les publications lisibles : les enjeux publiés ou prépubliés. */
export const listPublications = createServerFn({ method: 'GET' }).handler(() =>
  get<PublicationLine[]>('/publications'),
)

/** Une publication, ses maillons et les indicateurs choisis. */
export const getPublication = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string() }))
  .handler(({ data }) =>
    get<PublicationSheet>(`/publications/${encodeURIComponent(data.slug)}`),
  )

/** Les sources lues à la demande pour une commune, chez leur producteur. */
export const getLiveValues = createServerFn({ method: 'GET' })
  .validator(z.object({ level: z.string(), code: z.string() }))
  .handler(({ data }) =>
    get<LiveValues>(
      `/territories/${encodeURIComponent(data.level)}/${encodeURIComponent(data.code)}/live`,
    ),
  )

export const getElection = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string() }))
  .handler(({ data }) =>
    get<ElectionSheet>(`/elections/${encodeURIComponent(data.slug)}`),
  )
