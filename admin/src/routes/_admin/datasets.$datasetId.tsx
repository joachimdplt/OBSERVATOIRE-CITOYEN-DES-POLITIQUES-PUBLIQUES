import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Breadcrumb } from '../../components/atoms/Breadcrumb'
import { Card } from '../../components/atoms/Card'
import { PageHeader } from '../../components/atoms/PageHeader'
import { FedIndicatorList } from '../../components/organisms/catalogue/FedIndicatorList'
import { LinkIndicatorForm } from '../../components/organisms/catalogue/LinkIndicatorForm'
import { DepositForm } from '../../components/organisms/imports/DepositForm'
import { VersionList } from '../../components/organisms/imports/VersionList'
import {
  useCatalogue,
  useAmendCategories,
  useLinkIndicator,
  useRetireSource,
} from '../../hooks/catalogue/useCatalogue'
import { useDeposit, useVersions } from '../../hooks/imports/useImports'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/datasets/$datasetId')({
  component: DatasetPage,
})

function DatasetPage() {
  const { datasetId } = Route.useParams()
  const catalogue = useCatalogue().data
  const link = useLinkIndicator()
  const retire = useRetireSource()
  const amend = useAmendCategories()
  const dataset = catalogue
    ?.flatMap((p) => p.datasets.map((d) => ({ ...d, provider: p.acronym })))
    .find((d) => d.id === datasetId)
  const allIndicators = [
    ...new Map(
      (catalogue ?? [])
        .flatMap((p) => p.datasets.flatMap((d) => d.indicators))
        .map((i) => [i.code, i]),
    ).values(),
  ]
  const fed = new Set(dataset?.indicators.map((i) => i.code))
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
      <Card title="Indicateurs alimentés par ce jeu">
        <div className="space-y-4">
          <FedIndicatorList
            indicators={dataset?.indicators ?? []}
            pending={retire.isPending}
            reasons={retire.error ? reasonsOf(retire.error) : []}
            onRetire={(code, reason) =>
              retire.mutate({ code, datasetId, reason })
            }
            amending={{
              pending: amend.isPending,
              reasons: amend.error ? reasonsOf(amend.error) : [],
              onSubmit: (code, categories) =>
                amend.mutate({ code, categories }),
            }}
          />
          <LinkIndicatorForm
            candidates={allIndicators.filter((i) => !fed.has(i.code))}
            pending={link.isPending}
            reasons={link.error ? reasonsOf(link.error) : []}
            onLink={(code) => link.mutate({ code, datasetId })}
          />
        </div>
      </Card>
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
