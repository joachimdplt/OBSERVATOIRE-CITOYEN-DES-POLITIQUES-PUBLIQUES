import type { Frequency, Pillar, ProviderKind } from '../types/catalogue'
import type { Role } from '../types/session'
import type {
  ImportState,
  TerritoryLevel,
  VersionState,
} from '../types/imports'
import type { Tone } from '../components/atoms/StatusBadge'
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

export const VERSION_STATES: Record<
  VersionState,
  { label: string; tone: Tone }
> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  in_review: { label: 'En relecture', tone: 'warning' },
  preprint: { label: 'Prépublication', tone: 'warning' },
  published: { label: 'Publiée', tone: 'ok' },
  superseded: { label: 'Remplacée', tone: 'muted' },
}

export const IMPORT_STATES: Record<ImportState, { label: string; tone: Tone }> =
  {
    uploaded: { label: 'À décrire', tone: 'neutral' },
    described: { label: 'À contrôler', tone: 'neutral' },
    needs_correction: { label: 'À corriger', tone: 'critical' },
    validated: { label: 'Contrôlé', tone: 'ok' },
  }

export const TERRITORY_LEVELS: Record<TerritoryLevel, string> = {
  country: 'France',
  region: 'Région',
  department: 'Département',
  commune: 'Commune',
  municipal_district: 'Arrondissement municipal',
}

export const OBSERVATION_STATUSES = {
  documented: 'valeurs',
  not_documented: 'non documentées',
  confidential: 'sous secret statistique',
  not_applicable: 'sans objet',
} as const
