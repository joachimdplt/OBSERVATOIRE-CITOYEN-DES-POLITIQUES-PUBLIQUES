import type { Frequency, Pillar, ProviderKind } from '../types/catalogue'
import type { Role } from '../types/session'

/** Les douze piliers, dans l'ordre du cahier des charges. */
export const PILLAR_LABELS: Record<Pillar, string> = {
  agriculture_food: 'Agriculture et alimentation',
  health: 'Santé',
  education_research: 'Éducation et recherche',
  energy: 'Énergie',
  housing: 'Logement',
  transport_infrastructure: 'Transports et infrastructures',
  labour_economy_industry: 'Travail, économie et industrie',
  social_protection: 'Protection sociale',
  security_justice_defence: 'Sécurité, justice et défense',
  environment_resources: 'Environnement et ressources',
  institutions_public_services: 'Institutions et services publics',
  culture_sports_associations: 'Culture, sports et associations',
}

export const PROVIDER_KIND_LABELS: Record<ProviderKind, string> = {
  statistical_service: 'Service statistique ministériel',
  national_institute: 'Institut national',
  public_operator: 'Opérateur public',
  other: 'Autre',
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  annual: 'Annuelle',
  quarterly: 'Trimestrielle',
  monthly: 'Mensuelle',
  irregular: 'Irrégulière',
  one_off: 'Ponctuelle',
}

export const ROLE_LABELS: Record<Role, string> = {
  editor: 'Contribution',
  reviewer: 'Relecture',
  admin: 'Administration',
}
