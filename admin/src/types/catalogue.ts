export type ProviderKind =
  'statistical_service' | 'national_institute' | 'public_operator' | 'other'

export type Frequency =
  'annual' | 'quarterly' | 'monthly' | 'irregular' | 'one_off'

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

export type Aggregation = 'sum' | 'mean'

type DeclaredBy = { createdBy: { name: string } }

export type Indicator = DeclaredBy & {
  id: string
  code: string
  label: string
  definition: string
  scope: string
  unit: string
  pillar: Pillar
  allowedAggregations: Aggregation[]
  method: string
  limits: string
}

export type Dataset = DeclaredBy & {
  id: string
  producerRef: string
  title: string
  url: string
  license: string
  methodology: string
  frequency: Frequency
  indicators: Indicator[]
}

export type Provider = DeclaredBy & {
  id: string
  name: string
  acronym: string
  kind: ProviderKind
  officialUrl: string
  datasets: Dataset[]
}

export type NewProvider = Pick<
  Provider,
  'name' | 'acronym' | 'kind' | 'officialUrl'
>
export type NewDataset = Pick<
  Dataset,
  'producerRef' | 'title' | 'url' | 'license' | 'methodology' | 'frequency'
> & { providerId: string }
export type NewIndicator = Omit<Indicator, 'id' | 'createdBy'> & {
  datasetId: string
  kind?: 'number' | 'category'
  categories?: { code: string; label: string }[]
}
