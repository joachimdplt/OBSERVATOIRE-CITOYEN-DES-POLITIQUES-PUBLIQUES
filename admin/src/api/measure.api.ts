import { apiClient } from './client'

/** Les chiffres clés d'une mesure, tels que l'outil les a calculés. */
export type MeasureSummary = {
  demo: boolean
  verdicts: number
  candidates: number
  accepted: number
  rate: number | null
  classifierRate: number | null
  crossEntropy: number | null
  crossEntropyRandom: number | null
  /** La durée de la mise à jour qui a produit cette mesure. */
  durationMs?: number
}

/** Une mesure archivée, sans sa page. */
export type MeasureEntry = {
  id: string
  measuredAt: string
  summary: MeasureSummary
  createdBy: { name: string }
}

/** Une mesure archivée, avec sa page. */
export type MeasureReport = {
  id: string
  measuredAt: string
  summary: MeasureSummary
  html: string
}

export async function fetchMeasures(): Promise<MeasureEntry[]> {
  const { data } = await apiClient.get<MeasureEntry[]>(
    '/admin/subjects/measure',
  )
  return data
}

export async function fetchMeasure(id: string): Promise<MeasureReport> {
  const { data } = await apiClient.get<MeasureReport>(
    `/admin/subjects/measure/${id}`,
  )
  return data
}

/** Mettre à jour : remesurer le seuil, ranger les nouveaux chapitres, puis
 * archiver un nouveau rapport. `filing` résume le rangement. */
export async function runMeasure(): Promise<
  MeasureReport & { filing: string }
> {
  const { data } = await apiClient.post<MeasureReport & { filing: string }>(
    '/admin/subjects/measure',
  )
  return data
}

