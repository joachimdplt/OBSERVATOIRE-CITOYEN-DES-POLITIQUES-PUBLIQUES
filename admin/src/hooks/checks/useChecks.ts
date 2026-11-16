import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCandidateChecks,
  fetchGridTopics,
  fetchNextCheck,
  sendCheck,
} from '../../api/checks.api'
import type { Verdict } from '../../types/checks'
import { queryKeys } from '../queryKeys'

export function useCandidateChecks() {
  return useQuery({
    queryKey: queryKeys.checks,
    queryFn: fetchCandidateChecks,
  })
}

export function useNextCheck(candidateId: string) {
  return useQuery({
    queryKey: queryKeys.nextCheck(candidateId),
    queryFn: () => fetchNextCheck(candidateId),
  })
}

/** Un verdict fait passer à la carte suivante. */
export function useSendCheck(candidateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ labelId, verdict }: { labelId: string; verdict: Verdict }) =>
      sendCheck(labelId, verdict),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.nextCheck(candidateId) }),
        qc.invalidateQueries({ queryKey: queryKeys.checks }),
      ]),
  })
}

/** La grille change rarement : relue au plus toutes les cinq minutes, pour
 * qu'une traduction ou une relecture arrive sans recharger la page. */
export function useGridTopics() {
  return useQuery({
    queryKey: queryKeys.gridTopics,
    queryFn: fetchGridTopics,
    staleTime: 5 * 60 * 1000,
  })
}
