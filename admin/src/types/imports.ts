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
  firstRow?: number
  lastRow?: number
  territory: {
    column: string
    level: TerritoryLevel
    vintage: number
    /** « 045 -Loiret » : le code suivi de son libellé dans la même case. */
    codeWithLabel?: boolean
  }
  period: { column?: string; value?: string }
  decimalSeparator: ',' | '.'
  /** La colonne qui donne, ligne par ligne, la date du texte d'où vient la valeur. */
  referenceDateColumn?: string | null
  /** Les marques du fichier qui veulent dire « sans objet » (« NC », par exemple). */
  notApplicableMarkers?: string[]
  confidentialMarkers?: string[]
  zeroMarkers?: string[]
  /** Les lignes à garder : « colonne = valeur » ou « colonne ≠ valeur ». */
  rowFilters?: RowCondition[]
  values: { column: string; indicatorCode: string; when?: RowCondition[] }[]
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

/** Une condition sur une case : égale à une valeur, ou différente. */
export type RowCondition = {
  column: string
  equals?: string
  notEquals?: string
}
