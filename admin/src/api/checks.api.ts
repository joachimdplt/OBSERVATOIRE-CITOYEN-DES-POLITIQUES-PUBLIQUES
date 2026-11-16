import { apiClient } from './client'
import type {
  CandidateChecks,
  GridTopic,
  NextCheck,
  Verdict,
} from '../types/checks'

export async function fetchCandidateChecks(): Promise<CandidateChecks[]> {
  const { data } = await apiClient.get<CandidateChecks[]>(
    '/admin/subjects/checks',
  )
  return data
}

export async function fetchNextCheck(candidateId: string): Promise<NextCheck> {
  const { data } = await apiClient.get<NextCheck>(
    `/admin/subjects/checks/${candidateId}/next`,
  )
  return data
}

export async function sendCheck(labelId: string, verdict: Verdict) {
  await apiClient.post('/admin/subjects/checks', { labelId, verdict })
}

export async function fetchGridTopics(): Promise<GridTopic[]> {
  const { data } = await apiClient.get<GridTopic[]>(
    '/admin/subjects/checks/topics',
  )
  return data
}
