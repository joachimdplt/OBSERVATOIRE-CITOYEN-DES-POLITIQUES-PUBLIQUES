import { apiClient } from './client'
import type { SubjectReview } from '../types/subjects'

export async function fetchSubjectReview(): Promise<SubjectReview> {
  const { data } = await apiClient.get<SubjectReview>('/admin/subjects/review')
  return data
}

/** Le bon sujet (ou aucun), et pourquoi en une phrase. */
export async function decideSubject(
  id: string,
  code: string | null,
  reason: string,
) {
  await apiClient.post(`/admin/subjects/labels/${id}/decide`, { code, reason })
}
