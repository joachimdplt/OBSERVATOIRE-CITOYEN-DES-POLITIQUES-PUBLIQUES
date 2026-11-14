export type VersionState =
  'draft' | 'in_review' | 'preprint' | 'published' | 'superseded'
export type ImportState =
  'uploaded' | 'described' | 'needs_correction' | 'validated'
export type TerritoryLevel =
  'country' | 'region' | 'department' | 'commune' | 'municipal_district'

export type VersionLine = {
  id: string
  vintage: string
  state: VersionState
  fileName: string
  fileHash: string
  collectedAt: string
  depositedAt: string
  depositedBy: string
  importJob: { id: string; rowCount: number; state: ImportState } | null
}

export type ImportDescription = {
  headerRow: number
  lastRow?: number
  territory: { column: string; level: TerritoryLevel; vintage: number }
  period: { column?: string; value?: string }
  decimalSeparator: ',' | '.'
  values: { column: string; indicatorCode: string }[]
}

export type Anomaly = {
  rowNumber: number | null
  column: string | null
  kind: string
  severity: 'blocking' | 'info'
  message: string
}

export type ImportJob = {
  id: string
  state: ImportState
  format: 'csv' | 'xlsx'
  sheetNames: string[]
  sheet: string | null
  headerRow: number
  rowCount: number
  description: ImportDescription | null
  validatedAt: string | null
  anomalies: Anomaly[]
  observations: Partial<
    Record<
      'documented' | 'not_documented' | 'confidential' | 'not_applicable',
      number
    >
  >
  version: {
    id: string
    vintage: string
    state: VersionState
    fileName: string
    fileHash: string
    fileUrl: string
    collectedAt: string
    depositedBy: string
    dataset: { id: string; title: string }
  }
  columns: string[]
  sample: { rowNumber: number; cells: string[] }[]
}

export type Deposit = {
  file: File
  vintage: string
  fileUrl: string
  collectedAt: string
  sheet?: string
}
