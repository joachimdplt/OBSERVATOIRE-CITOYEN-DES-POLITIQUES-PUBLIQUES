import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addIndicatorSource,
  createDataset,
  createIndicator,
  createProvider,
  fetchCatalogue,
} from '../../api/catalogue.api'
import { queryKeys } from '../queryKeys'

export function useCatalogue() {
  return useQuery({ queryKey: queryKeys.catalogue, queryFn: fetchCatalogue })
}

/** Chaque déclaration change le catalogue : on le relit. */
function useDeclare<T>(mutationFn: (payload: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.catalogue }),
  })
}

export const useCreateProvider = () => useDeclare(createProvider)
export const useCreateDataset = () => useDeclare(createDataset)
export const useCreateIndicator = () => useDeclare(createIndicator)

export const useLinkIndicator = () =>
  useDeclare(({ code, datasetId }: { code: string; datasetId: string }) =>
    addIndicatorSource(code, datasetId),
  )
