export type Pillar =
  | 'agriculture_food'
  | 'health'
  | 'education_research'
  | 'energy'
  | 'housing'
  | 'transport_infrastructure'
  | 'labour_economy_industry'
  | 'social_protection'
  | 'security_justice_defence'
  | 'environment_resources'
  | 'institutions_public_services'
  | 'culture_sports_associations'

export type PublicStatus = 'preprint' | 'published'

/** Une catégorie d'une liste fermée, avec le libellé de son texte officiel. */
export type Category = {
  code: string
  label: string
  explanation?: string
  /** Le libellé ou l'explication propre à une région, par code de région. */
  regions?: Record<string, { label?: string; explanation?: string }>
}

/** L'échelle où les valeurs se comparent : la France, ou une région à la fois. */
export type ComparisonScale = 'national' | 'regional'

export type IndicatorKind = 'number' | 'category'

export type ObservationStatus =
  'documented' | 'not_documented' | 'confidential' | 'not_applicable'

export type IndicatorLine = {
  code: string
  label: string
  pillar: Pillar
  unit: string
  kind: IndicatorKind
  question: string | null
  /** Faux : un élément de contexte, lu dans la fiche d'une commune et pas sur la carte. */
  mapLayer: boolean
  producer: string
  vintage: string
  vintages: string[]
  status: PublicStatus
  statusLabel: string
}

export type Provenance = {
  status: PublicStatus
  statusLabel: string
  producer: { name: string; acronym: string; url: string }
  dataset: {
    title: string
    producerRef: string
    url: string
    methodology: string
  }
  version: {
    vintage: string
    fileUrl: string
    fileHash: string
    collectedAt: string
    publishedAt: string | null
    authoredBy: string | null
    reviewedBy: string | null
  }
  licenses: {
    content: { name: string; url: string }
    data: { name: string; holder: string }
    sourceCode: { license: string; url: string }
  }
}

export type IndicatorSheet = {
  code: string
  label: string
  definition: string
  scope: string
  unit: string
  pillar: Pillar
  method: string
  limits: string
  allowedAggregations: ('sum' | 'mean')[]
  kind: IndicatorKind
  categories: Category[] | null
  comparisonScale: ComparisonScale
  /** Les régions où l'indicateur a des valeurs. */
  regions: { code: string; name: string }[]
  question: string | null
  readingTemplate: string | null
  scaleLow: string | null
  scaleHigh: string | null
  periods: string[]
  territoryLevels: string[]
  /** Une provenance par millésime visible, le plus récent en premier. */
  provenance: Provenance[]
  /** Les sources retirées par l'équipe : leurs valeurs ne s'affichent plus. */
  retiredSources: {
    producer: string
    dataset: string
    retiredAt: string
    retiredBy: string | null
    reason: string
  }[]
}

export type Observation = {
  territory: { level: string; code: string; name: string; vintage: number }
  period: string
  status: ObservationStatus
  value: string | null
  category: string | null
  sourceRow: number
  vintage: string
}

export type ObservationPage = {
  total: number
  limit: number
  offset: number
  observations: Observation[]
}

/** Une couche de la carte, pour un territoire : ses valeurs par période. */
export type TerritoryLayer = {
  indicator: {
    code: string
    label: string
    unit: string
    pillar: Pillar
    kind: IndicatorKind
    categories: Category[] | null
    limits: string
    question: string | null
    readingTemplate: string | null
    mapLayer: boolean
    producer: string
  }
  /** Le territoire des valeurs : la commune elle-même, ou son département. */
  scope: { level: string; code: string; name: string }
  /** Le jeu de données d'où vient la couche. */
  dataset: { id: string; title: string }
  values: (Omit<Observation, 'territory' | 'vintage'> & {
    /** La date du texte d'où vient la valeur (AAAA-MM-JJ), si le fichier la donne. */
    referenceDate: string | null
    publication: { status: PublicStatus; label: string }
  })[]
}

export type TerritoryValues = {
  territory: { code: string; level: string; name: string }
  layers: TerritoryLayer[]
}
