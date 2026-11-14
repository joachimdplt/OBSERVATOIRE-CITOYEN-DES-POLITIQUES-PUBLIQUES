import { apiClient } from './client'
import type {
  Deposit,
  ImportDescription,
  ImportJob,
  VersionLine,
} from '../types/imports'

export async function fetchVersions(datasetId: string): Promise<VersionLine[]> {
  const { data } = await apiClient.get<VersionLine[]>(
    `/admin/datasets/${datasetId}/versions`,
  )
  return data
}

export async function depositFile(datasetId: string, deposit: Deposit) {
  const form = new FormData()
  form.append('file', deposit.file)
  form.append('vintage', deposit.vintage)
  form.append('fileUrl', deposit.fileUrl)
  form.append('collectedAt', deposit.collectedAt)
  if (deposit.sheet) form.append('sheet', deposit.sheet)
  const { data } = await apiClient.post<{ job: { id: string } }>(
    `/admin/datasets/${datasetId}/versions`,
    form,
  )
  return data
}

export async function fetchImportJob(
  id: string,
  headerRow?: number,
): Promise<ImportJob> {
  const { data } = await apiClient.get<ImportJob>(`/admin/import-jobs/${id}`, {
    params: headerRow ? { headerRow } : {},
  })
  return data
}

export async function describeImportJob(
  id: string,
  description: ImportDescription,
) {
  await apiClient.put(`/admin/import-jobs/${id}/description`, description)
}

export async function validateImportJob(id: string) {
  const { data } = await apiClient.post<{ state: string }>(
    `/admin/import-jobs/${id}/validate`,
  )
  return data
}
