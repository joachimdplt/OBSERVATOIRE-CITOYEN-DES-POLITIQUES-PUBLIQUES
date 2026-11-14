import type { Tone } from '../components/atoms/StatusBadge'
import type { PublicationState } from '../types/publications'

/** L'état d'une version de publication, en mots, et sa teinte de statut. */
export const PUBLICATION_STATES: Record<
  PublicationState,
  { label: string; tone: Tone }
> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  in_review: { label: 'En relecture', tone: 'warning' },
  preprint: { label: 'Prépubliée', tone: 'warning' },
  published: { label: 'Publiée', tone: 'ok' },
  superseded: { label: 'Remplacée', tone: 'muted' },
}
