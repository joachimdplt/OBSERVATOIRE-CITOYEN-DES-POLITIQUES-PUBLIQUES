import { Button } from '../../atoms/Button'

type Props = {
  canPreprint: boolean
  pending: boolean
  onSubmit: () => void
  onPreprint: () => void
}

/**
 * Sortir un brouillon contrôlé de l'équipe : le soumettre à relecture, ou,
 * pour l'administration pendant le lancement, le prépublier seul, étiqueté
 * comme tel.
 */
export function PublishActions({
  canPreprint,
  pending,
  onSubmit,
  onPreprint,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={onSubmit}>
          Soumettre à relecture
        </Button>
        {canPreprint && (
          <Button variant="secondary" disabled={pending} onClick={onPreprint}>
            Prépublier seul
          </Button>
        )}
      </div>
      {canPreprint && (
        <p className="text-xs text-slate-500">
          Une prépublication est visible du public, étiquetée « vérifiée par son
          seul auteur, en attente de relecture ». Un relecteur la fera passer à
          « publiée ».
        </p>
      )}
    </div>
  )
}
