import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Breadcrumb } from '../../components/atoms/Breadcrumb'
import { Card } from '../../components/atoms/Card'
import { PageHeader } from '../../components/atoms/PageHeader'
import { ProviderForm } from '../../components/organisms/catalogue/ProviderForm'
import { useCreateProvider } from '../../hooks/catalogue/useCatalogue'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/providers/new')({
  component: NewProviderPage,
})

function NewProviderPage() {
  const create = useCreateProvider()
  const navigate = useNavigate()
  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: 'Catalogue', to: '/' },
          { label: 'Nouveau producteur' },
        ]}
      />
      <PageHeader
        title="Nouveau producteur"
        lead="Un service qui publie des statistiques publiques."
      />
      <Card className="max-w-2xl">
        <ProviderForm
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
