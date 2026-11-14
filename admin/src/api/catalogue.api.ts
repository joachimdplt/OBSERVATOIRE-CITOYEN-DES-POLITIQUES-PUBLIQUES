import { apiClient } from './client'
import type {
  NewDataset,
  NewIndicator,
  NewProvider,
  Provider,
} from '../types/catalogue'

export async function fetchCatalogue(): Promise<Provider[]> {
  const { data } = await apiClient.get<Provider[]>('/admin/catalogue')
  return data
}

export async function createProvider(payload: NewProvider) {
  const { data } = await apiClient.post<{ id: string }>(
    '/admin/providers',
    payload,
  )
  return data
}

export async function createDataset(payload: NewDataset) {
  const { data } = await apiClient.post<{ id: string }>(
    '/admin/datasets',
    payload,
  )
  return data
}

export async function createIndicator(payload: NewIndicator) {
  const { data } = await apiClient.post<{ id: string; code: string }>(
    '/admin/indicators',
    payload,
  )
  return data
}

/** Relier un indicateur existant à un jeu de plus : l'arrêté d'une autre ARS, par exemple. */
export async function addIndicatorSource(code: string, datasetId: string) {
  await apiClient.post(
    `/admin/indicators/${encodeURIComponent(code)}/sources`,
    { datasetId },
  )
}

/** Retirer un jeu des sources d'un indicateur, avec sa raison. Rien ne s'efface. */
export async function retireIndicatorSource(
  code: string,
  datasetId: string,
  reason: string,
) {
  await apiClient.post(
    `/admin/indicators/${encodeURIComponent(code)}/sources/${datasetId}/retire`,
    { reason },
  )
}
