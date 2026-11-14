import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Breadcrumb } from '../../components/atoms/Breadcrumb'
import { Card } from '../../components/atoms/Card'
import { PageHeader } from '../../components/atoms/PageHeader'
import { DepositForm } from '../../components/organisms/imports/DepositForm'
import { VersionList } from '../../components/organisms/imports/VersionList'
import { useCatalogue } from '../../hooks/catalogue/useCatalogue'
import { useDeposit, useVersions } from '../../hooks/imports/useImports'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/datasets/$datasetId')({
  component: DatasetPage,
})

function DatasetPage() {
  const { datasetId } = Route.useParams()
  const dataset = useCatalogue()
    .data?.flatMap((p) =>
      p.datasets.map((d) => ({ ...d, provider: p.acronym })),
    )
    .find((d) => d.id === datasetId)
  const versions = useVersions(datasetId)
  const deposit = useDeposit(datasetId)
  const navigate = useNavigate()

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: 'Catalogue', to: '/' },
          { label: dataset?.title ?? 'Jeu de données' },
        ]}
      />
      <PageHeader
        title={dataset?.title ?? 'Jeu de données'}
        lead={dataset ? `${dataset.provider} · ${dataset.license}` : undefined}
      />
      <Card title="Déposer un fichier">
        <DepositForm
          pending={deposit.isPending}
          reasons={deposit.error ? reasonsOf(deposit.error) : []}
          onSubmit={(d) =>
            deposit.mutate(d, {
              onSuccess: ({ job }) =>
                navigate({ to: '/imports/$jobId', params: { jobId: job.id } }),
            })
          }
        />
      </Card>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Versions</h2>
        {versions.data && <VersionList versions={versions.data} />}
      </section>
    </>
  )
}
