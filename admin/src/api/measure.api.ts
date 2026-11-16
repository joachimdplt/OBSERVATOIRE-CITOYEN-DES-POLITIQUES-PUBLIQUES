import { apiClient } from './client'

/** Le rapport de mesure : sa page, et quand elle a été calculée. */
export type MeasureReport = { html: string | null; generatedAt: string | null }

export async function fetchMeasure(): Promise<MeasureReport> {
  const { data } = await apiClient.get<MeasureReport>('/admin/subjects/measure')
  return data
}

export async function runMeasure(): Promise<MeasureReport> {
  const { data } = await apiClient.post<MeasureReport>(
    '/admin/subjects/measure',
  )
  return data
}
