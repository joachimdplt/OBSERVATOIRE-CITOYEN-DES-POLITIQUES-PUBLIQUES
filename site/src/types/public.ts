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

export type ObservationStatus =
  'documented' | 'not_documented' | 'confidential' | 'not_applicable'

export type IndicatorLine = {
  code: string
  label: string
  pillar: Pillar
  unit: string
  producer: string
  vintage: string
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
  periods: string[]
  territoryLevels: string[]
  provenance: Provenance
}

export type Observation = {
  territory: { level: string; code: string; name: string; vintage: number }
  period: string
  status: ObservationStatus
  value: string | null
  sourceRow: number
}

export type ObservationPage = {
  total: number
  limit: number
  offset: number
  observations: Observation[]
}
