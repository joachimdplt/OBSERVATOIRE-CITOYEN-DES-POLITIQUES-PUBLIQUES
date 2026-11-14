import type { VersionState } from './imports'

export type QueueLine = {
  id: string
  dataset: string
  vintage: string
  state: VersionState
  fileName: string
  fileUrl: string
  submittedBy: { id: string; name: string } | null
  submittedAt: string | null
  importJobId: string | null
  observations: Record<string, number>
}

export type HistoryEvent = {
  action: 'submitted' | 'preprinted' | 'approved' | 'rejected' | 'superseded'
  by: string
  at: string
  justification: string | null
}

export type VersionHistory = {
  id: string
  vintage: string
  state: VersionState
  events: HistoryEvent[]
}
