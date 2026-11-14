import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Breadcrumb } from '../../components/atoms/Breadcrumb'
import { Card } from '../../components/atoms/Card'
import { PageHeader } from '../../components/atoms/PageHeader'
import { IndicatorForm } from '../../components/organisms/catalogue/IndicatorForm'
import {
  useCatalogue,
  useCreateIndicator,
} from '../../hooks/catalogue/useCatalogue'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/indicators/new')({
  validateSearch: z.object({ dataset: z.string() }),
  component: NewIndicatorPage,
})

function NewIndicatorPage() {
  const { dataset: datasetId } = Route.useSearch()
  const dataset = useCatalogue()
    .data?.flatMap((p) => p.datasets)
    .find((d) => d.id === datasetId)
  const create = useCreateIndicator()
  const navigate = useNavigate()
  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: 'Catalogue', to: '/' },
          { label: 'Nouvel indicateur' },
        ]}
      />
      <PageHeader
        title="Nouvel indicateur"
        lead={dataset ? `Du jeu « ${dataset.title} ».` : undefined}
      />
      <Card className="max-w-2xl">
        <IndicatorForm
          datasetId={datasetId}
          pending={create.isPending}
          reasons={create.error ? reasonsOf(create.error) : []}
          onSubmit={(values) =>
            create.mutate(values, { onSuccess: () => navigate({ to: '/' }) })
          }
        />
      </Card>
    </>
  )
}
