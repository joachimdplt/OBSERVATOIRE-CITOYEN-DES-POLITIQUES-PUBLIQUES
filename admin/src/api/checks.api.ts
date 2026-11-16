import { apiClient } from './client'
import type {
  CandidateChecks,
  GridTopic,
  NextCheck,
  NextReclass,
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

export async function fetchNextReclass(
  candidateId: string,
): Promise<NextReclass> {
  const { data } = await apiClient.get<NextReclass>(
    `/admin/subjects/checks/${candidateId}/reclass/next`,
  )
  return data
}

/** Le bon sujet, ou `null` : le texte n'est pas une position du candidat. */
/** Le bon sujet ; ou, sans sujet, « pas une position » ou « sans
 * politique publique visée » (noTopic). */
export async function sendReclass(
  labelId: string,
  code: string | null,
  noTopic = false,
  reason = '',
) {
  await apiClient.post('/admin/subjects/checks/reclass', {
    labelId,
    code,
    noTopic,
    reason,
  })
}
