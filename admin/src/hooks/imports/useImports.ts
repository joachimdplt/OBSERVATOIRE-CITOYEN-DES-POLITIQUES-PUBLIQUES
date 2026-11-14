import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  depositFile,
  describeImportJob,
  fetchImportJob,
  fetchVersions,
  validateImportJob,
} from '../../api/imports.api'
import { queryKeys } from '../queryKeys'
import type { Deposit, ImportDescription } from '../../types/imports'

export function useVersions(datasetId: string) {
  return useQuery({
    queryKey: queryKeys.versions(datasetId),
    queryFn: () => fetchVersions(datasetId),
  })
}

export function useDeposit(datasetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deposit: Deposit) => depositFile(datasetId, deposit),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.versions(datasetId) }),
  })
}

/** L'import, lu avec la ligne d'en-têtes enregistrée ou celle qu'on essaie. */
export function useImportJob(id: string, headerRow?: number) {
  return useQuery({
    queryKey: queryKeys.importJob(id, headerRow),
    queryFn: () => fetchImportJob(id, headerRow),
    placeholderData: (previous) => previous,
  })
}

/** Décrire ou contrôler change l'import et la liste des versions de son jeu. */
function useImportStep<T>(id: string, step: (payload: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: step,
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['import-jobs', id] })
      await qc.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

export const useDescribe = (id: string) =>
  useImportStep(id, (d: ImportDescription) => describeImportJob(id, d))
export const useValidate = (id: string) =>
  useImportStep(id, () => validateImportJob(id))
