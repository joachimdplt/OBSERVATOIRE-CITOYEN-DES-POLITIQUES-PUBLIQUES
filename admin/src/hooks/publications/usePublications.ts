import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approvePublication,
  createPublication,
  fetchPublications,
  openPublicationDraft,
  preprintPublication,
  writePublicationDraft,
} from '../../api/publications.api'
import type { PublicationContent } from '../../types/publications'
import { queryKeys } from '../queryKeys'

export function usePublications() {
  return useQuery({
    queryKey: queryKeys.publications,
    queryFn: fetchPublications,
  })
}

/** Chaque geste change une publication : on relit la liste. */
function useGesture<T, TResult>(mutationFn: (payload: T) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.publications }),
  })
}

export const useCreatePublication = () => useGesture(createPublication)
export const useWriteDraft = () =>
  useGesture(({ id, content }: { id: string; content: PublicationContent }) =>
    writePublicationDraft(id, content),
  )
export const usePreprintPublication = () => useGesture(preprintPublication)
export const useApprovePublication = () => useGesture(approvePublication)
export const useOpenDraft = () => useGesture(openPublicationDraft)
