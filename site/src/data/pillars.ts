import type { Pillar } from '../types/public'

/** Les douze piliers, dans l'ordre du cahier des charges. */
export const PILLARS: { id: Pillar; label: string }[] = [
  { id: 'agriculture_food', label: 'Agriculture et alimentation' },
  { id: 'health', label: 'Santé' },
  { id: 'education_research', label: 'Éducation et recherche' },
  { id: 'energy', label: 'Énergie' },
  { id: 'housing', label: 'Logement' },
  { id: 'transport_infrastructure', label: 'Transports et infrastructures' },
  { id: 'labour_economy_industry', label: 'Travail, économie et industrie' },
  { id: 'social_protection', label: 'Protection sociale' },
  { id: 'security_justice_defence', label: 'Sécurité, justice et défense' },
  { id: 'environment_resources', label: 'Environnement et ressources' },
  {
    id: 'institutions_public_services',
    label: 'Institutions et services publics',
  },
  {
    id: 'culture_sports_associations',
    label: 'Culture, sports et associations',
  },
]

export const pillarLabel = (id: Pillar) =>
  PILLARS.find((p) => p.id === id)?.label ?? id
