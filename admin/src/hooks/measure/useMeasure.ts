import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchMeasure,
  fetchMeasures,
  runMeasure,
} from '../../api/measure.api'
import { queryKeys } from '../queryKeys'

export function useMeasures() {
  return useQuery({ queryKey: queryKeys.measure, queryFn: fetchMeasures })
}

export function useMeasureReport(id: string | null) {
  return useQuery({
    queryKey: [...queryKeys.measure, id],
    queryFn: () => fetchMeasure(id!),
    enabled: id !== null,
    // Une mesure archivée ne change jamais.
    staleTime: Infinity,
  })
}

/** Recalculer : l'export des verdicts puis l'outil Python, côté serveur. */
export function useRunMeasure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: runMeasure,
    onSuccess: (report) => {
      qc.setQueryData([...queryKeys.measure, report.id], report)
      // Le seuil et le rangement ont changé : tout se relit.
      return qc.invalidateQueries()
    },
  })
}
