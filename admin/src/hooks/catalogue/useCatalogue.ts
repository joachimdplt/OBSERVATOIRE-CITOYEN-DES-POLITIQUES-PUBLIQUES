import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addIndicatorSource,
  amendCategories,
  createDataset,
  createIndicator,
  createProvider,
  fetchCatalogue,
  retireIndicatorSource,
} from '../../api/catalogue.api'
import type { Category } from '../../types/catalogue'
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

export const useAmendCategories = () =>
  useDeclare(({ code, categories }: { code: string; categories: Category[] }) =>
    amendCategories(code, categories),
  )

export const useRetireSource = () =>
  useDeclare(
    ({
      code,
      datasetId,
      reason,
    }: {
      code: string
      datasetId: string
      reason: string
    }) => retireIndicatorSource(code, datasetId, reason),
  )
