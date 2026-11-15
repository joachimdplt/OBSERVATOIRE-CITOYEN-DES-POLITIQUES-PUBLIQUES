import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { decideSubject, fetchSubjectReview } from '../../api/subjects.api'
import { queryKeys } from '../queryKeys'

export function useSubjectReview() {
  return useQuery({
    queryKey: queryKeys.subjectReview,
    queryFn: fetchSubjectReview,
  })
}

/** Une décision retire le rangement de la file : la file se relit. */
export function useDecideSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      code,
      reason,
    }: {
      id: string
      code: string | null
      reason: string
    }) => decideSubject(id, code, reason),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: queryKeys.subjectReview }),
  })
}
