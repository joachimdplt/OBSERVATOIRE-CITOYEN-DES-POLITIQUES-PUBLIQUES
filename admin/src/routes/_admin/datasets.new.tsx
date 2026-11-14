import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Breadcrumb } from '../../components/atoms/Breadcrumb'
import { Card } from '../../components/atoms/Card'
import { PageHeader } from '../../components/atoms/PageHeader'
import { DatasetForm } from '../../components/organisms/catalogue/DatasetForm'
import {
  useCatalogue,
  useCreateDataset,
} from '../../hooks/catalogue/useCatalogue'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/datasets/new')({
  validateSearch: z.object({ provider: z.string() }),
  component: NewDatasetPage,
})

function NewDatasetPage() {
  const { provider: providerId } = Route.useSearch()
  const provider = useCatalogue().data?.find((p) => p.id === providerId)
  const create = useCreateDataset()
  const navigate = useNavigate()
  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: 'Catalogue', to: '/' },
          { label: 'Nouveau jeu de données' },
        ]}
      />
      <PageHeader
        title="Nouveau jeu de données"
        lead={provider ? `Publié par ${provider.acronym}.` : undefined}
      />
      <Card className="max-w-2xl">
        <DatasetForm
          providerId={providerId}
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
