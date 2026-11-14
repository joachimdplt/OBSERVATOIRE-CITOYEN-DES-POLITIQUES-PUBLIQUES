import { StatusBadge } from '../atoms/StatusBadge'

/** L'étiquette d'une version : prépubliée par son seul auteur, ou relue. */
export function PublicationBadge({
  status,
  label,
}: {
  status: 'preprint' | 'published'
  label: string
}) {
  return (
    <StatusBadge tone={status === 'published' ? 'reviewed' : 'pending'}>
      {label}
    </StatusBadge>
  )
}
