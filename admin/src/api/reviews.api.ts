import { apiClient } from './client'
import type { QueueLine, VersionHistory } from '../types/reviews'

export async function fetchReviewQueue(): Promise<QueueLine[]> {
  const { data } = await apiClient.get<QueueLine[]>('/admin/review-queue')
  return data
}

export async function fetchVersionHistory(
  versionId: string,
): Promise<VersionHistory> {
  const { data } = await apiClient.get<VersionHistory>(
    `/admin/versions/${versionId}/history`,
  )
  return data
}

export async function submitVersion(versionId: string) {
  await apiClient.post(`/admin/versions/${versionId}/submit`)
}

export async function preprintVersion(versionId: string) {
  await apiClient.post(`/admin/versions/${versionId}/preprint`)
}

export async function approveVersion(
  versionId: string,
  justification?: string,
) {
  await apiClient.post(`/admin/versions/${versionId}/approve`, {
    justification,
  })
}

export async function rejectVersion(versionId: string, justification: string) {
  await apiClient.post(`/admin/versions/${versionId}/reject`, { justification })
}
