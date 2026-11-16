import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMeasure, runMeasure } from '../../api/measure.api'
import { queryKeys } from '../queryKeys'

export function useMeasure() {
  return useQuery({ queryKey: queryKeys.measure, queryFn: fetchMeasure })
}

/** Recalculer : l'export des verdicts puis l'outil Python, côté serveur. */
export function useRunMeasure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: runMeasure,
    onSuccess: (report) => qc.setQueryData(queryKeys.measure, report),
  })
}
