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

/** Une publication lisible : un enjeu, ses maillons et les indicateurs choisis. */
export type PublicationLine = {
  slug: string
  pillar: Pillar
  title: string
  summary: string
  number: number
  status: PublicStatus
  statusLabel: string
  publishedAt: string | null
}

export type PublicationSheet = PublicationLine & {
  authoredBy: string | null
  reviewedBy: string | null
  sections: {
    title: string
    text: string
    indicators: {
      code: string
      label: string
      unit: string
      kind: IndicatorKind
      mapLayer: boolean
      justification: string
    }[]
    /** Les mesures rattachées : la citation d'abord, puis le libellé et le document. */
    measures: {
      article: string
      quote: string
      label: string
      justification: string
      document: {
        kind: 'bill' | 'government_bill' | 'law' | 'amendment' | 'programme'
        title: string
        number: string | null
        chamber: 'national_assembly' | 'senate' | null
        filedAt: string
        url: string
        firstAuthor: string
        authorGroup: string | null
        authorGroupSource: string | null
        progress: string | null
      }
    }[]
  }[]
  history: { number: number; status: string; publishedAt: string | null }[]
  /** Collectés sur les données ouvertes du Parlement, non relus. */
  collected: CollectedText[]
}

/** Un texte déposé, collecté automatiquement : ses articles, mot pour mot. */
export type CollectedText = {
  term: string
  kind: 'bill' | 'government_bill' | 'law' | 'amendment' | 'programme'
  title: string
  number: string | null
  chamber: 'national_assembly' | 'senate' | null
  filedAt: string
  url: string
  firstAuthor: string
  authorGroup: string | null
  authorGroupSource: string | null
  articles: { article: string; quote: string }[]
}

/** Les sources lues à la demande pour une commune, telles que reçues. */
export type LiveValues = {
  territory: string
  sources: {
    source: {
      slug: string
      title: string
      producer: string
      pillar: Pillar
      datasetUrl: string
      license: string
      rowsUrl: string
    }
    fetchedAt: string
    resourceModifiedAt: string | null
    values: {
      label: string
      counted: string | null
      period: string
      unit: string
      value: string | null
      status: ObservationStatus
      row: string | number | null
    }[]
  }[]
}

/** L'état du programme d'un candidat, constaté à une date. */
export type ProgrammeStatus = 'complete' | 'partial' | 'none'

/** Une élection et ses candidats déclarés, selon un critère écrit. */
export type ElectionSheet = {
  slug: string
  name: string
  date: string | null
  criterion: string
  candidates: {
    slug: string
    name: string
    party: string | null
    declaredAt: string
    declarationSource: string
    programmeStatus: ProgrammeStatus
    programmeUrl: string | null
    programmeNote: string | null
    programmeCheckedAt: string | null
  }[]
}
