import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveVersion,
  fetchReviewQueue,
  fetchVersionHistory,
  preprintVersion,
  rejectVersion,
  submitVersion,
} from '../../api/reviews.api'
import { queryKeys } from '../queryKeys'

export function useReviewQueue() {
  return useQuery({
    queryKey: queryKeys.reviewQueue,
    queryFn: fetchReviewQueue,
  })
}

export function useVersionHistory(versionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.history(versionId ?? ''),
    queryFn: () => fetchVersionHistory(versionId!),
    enabled: !!versionId,
  })
}

/**
 * Un geste de relecture change l'état de la version, son import, la file,
 * l'historique et la liste des versions du jeu : tout se relit.
 */
function useReviewStep<T>(step: (payload: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: step,
    onSettled: async () => {
      await Promise.all(
        [
          queryKeys.reviewQueue,
          ['import-jobs'],
          ['versions'],
          ['datasets'],
        ].map((queryKey) => qc.invalidateQueries({ queryKey })),
      )
    },
  })
}

export const useSubmit = () => useReviewStep(submitVersion)
export const usePreprint = () => useReviewStep(preprintVersion)
export const useApprove = () =>
  useReviewStep(
    ({ id, justification }: { id: string; justification?: string }) =>
      approveVersion(id, justification),
  )
export const useReject = () =>
  useReviewStep(
    ({ id, justification }: { id: string; justification: string }) =>
      rejectVersion(id, justification),
  )
