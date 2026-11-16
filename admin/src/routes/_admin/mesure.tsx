import { createFileRoute } from '@tanstack/react-router'
import { Button } from '../../components/atoms/Button'
import { Notice } from '../../components/atoms/Notice'
import { PageHeader } from '../../components/atoms/PageHeader'
import { useMeasure, useRunMeasure } from '../../hooks/measure/useMeasure'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/mesure')({
  component: MeasurePage,
})

/**
 * Le rapport de l'outil de mesure Python : taux par candidat, voix du vote,
 * calibration et entropie croisée du classeur, calculés sur les seuls
 * verdicts des cartes.
 */
function MeasurePage() {
  const measure = useMeasure()
  const run = useRunMeasure()
  const at = measure.data?.generatedAt
  return (
    <>
      <PageHeader
        title="Mesure"
        lead="Le rapport de l’outil de mesure, calculé sur vos seuls verdicts. Recalculez après une séance de cartes."
      />
      <div className="flex items-center gap-4">
        <Button disabled={run.isPending} onClick={() => run.mutate()}>
          {run.isPending ? 'Calcul en cours…' : 'Recalculer'}
        </Button>
        <span className="text-sm text-slate-500">
          {at
            ? `Calculé le ${new Date(at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}`
            : 'Jamais calculé'}
        </span>
      </div>
      <Notice reasons={run.error ? reasonsOf(run.error) : []} />
      {measure.data?.html && (
        <iframe
          title="Rapport de mesure"
          srcDoc={measure.data.html}
          sandbox=""
          className="surface h-[calc(100dvh-16rem)] w-full"
        />
      )}
    </>
  )
}
