import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { fetchSession, signIn, signOut } from '../../api/session.api'
import { queryKeys } from '../queryKeys'

/** Qui est connecté. Une session absente n'est pas une panne : on ne réessaie pas. */
export const sessionQuery = queryOptions({
  queryKey: queryKeys.session,
  queryFn: fetchSession,
  retry: false,
  staleTime: 60_000,
})

export function useSession() {
  return useQuery(sessionQuery)
}

export function useSignIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: signIn,
    onSuccess: (member) => qc.setQueryData(queryKeys.session, member),
  })
}

/** Fermer la session vide tout le cache : rien d'un compte ne reste pour le suivant. */
export function useSignOut() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: signOut, onSettled: () => qc.clear() })
}
