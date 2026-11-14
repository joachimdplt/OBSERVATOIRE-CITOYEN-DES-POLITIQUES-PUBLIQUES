import { apiClient } from './client'
import type {
  NewPublication,
  Publication,
  PublicationContent,
} from '../types/publications'

export async function fetchPublications(): Promise<Publication[]> {
  const { data } = await apiClient.get<Publication[]>('/admin/publications')
  return data
}

export async function createPublication(payload: NewPublication) {
  const { data } = await apiClient.post<Publication>(
    '/admin/publications',
    payload,
  )
  return data
}

export async function writePublicationDraft(
  versionId: string,
  content: PublicationContent,
) {
  await apiClient.put(`/admin/publication-versions/${versionId}`, content)
}

export async function preprintPublication(versionId: string) {
  await apiClient.post(`/admin/publication-versions/${versionId}/preprint`)
}

export async function approvePublication(versionId: string) {
  await apiClient.post(`/admin/publication-versions/${versionId}/approve`, {})
}

export async function openPublicationDraft(slug: string) {
  await apiClient.post(`/admin/publications/${encodeURIComponent(slug)}/drafts`)
}
