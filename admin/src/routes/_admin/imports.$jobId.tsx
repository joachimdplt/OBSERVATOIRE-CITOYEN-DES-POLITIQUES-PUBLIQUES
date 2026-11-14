import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Breadcrumb } from '../../components/atoms/Breadcrumb'
import { Button } from '../../components/atoms/Button'
import { Card } from '../../components/atoms/Card'
import { Notice } from '../../components/atoms/Notice'
import { PageHeader } from '../../components/atoms/PageHeader'
import { ControlReport } from '../../components/organisms/imports/ControlReport'
import { DescriptionForm } from '../../components/organisms/imports/DescriptionForm'
import { ImportPreview } from '../../components/organisms/imports/ImportPreview'
import { PublishActions } from '../../components/organisms/reviews/PublishActions'
import { VersionHistory } from '../../components/organisms/reviews/VersionHistory'
import { can } from '../../domain/roles'
import { useCatalogue } from '../../hooks/catalogue/useCatalogue'
import {
  useDescribe,
  useImportJob,
  useValidate,
} from '../../hooks/imports/useImports'
import {
  usePreprint,
  useSubmit,
  useVersionHistory,
} from '../../hooks/reviews/useReviews'
import { useSession } from '../../hooks/session/useSession'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/imports/$jobId')({
  component: ImportPage,
})

function ImportPage() {
  const { jobId } = Route.useParams()
  const [headerRow, setHeaderRow] = useState<number>()
  const { data: job } = useImportJob(jobId, headerRow)
  const indicators =
    useCatalogue()
      .data?.flatMap((p) => p.datasets)
      .find((d) => d.id === job?.version.dataset.id)?.indicators ?? []
  const describe = useDescribe(jobId)
  const validate = useValidate(jobId)
  const { data: member } = useSession()
  const submit = useSubmit()
  const preprint = usePreprint()
  const history = useVersionHistory(job?.version.id)
  if (!job) return <p className="text-sm text-slate-500">Chargement…</p>
  const editable = job.version.state === 'draft'

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: 'Catalogue', to: '/' },
          {
            label: job.version.dataset.title,
            to: `/datasets/${job.version.dataset.id}`,
          },
          { label: `Millésime ${job.version.vintage}` },
        ]}
      />
      <PageHeader
        title={job.version.fileName}
        lead={`${job.rowCount} lignes lues${job.sheet ? `, onglet « ${job.sheet} »` : ''} · déposé par ${job.version.depositedBy}`}
      />
      <Card title="Le fichier tel qu’il a été lu">
        <label className="mb-4 flex items-center gap-3 text-sm text-slate-600">
          Ligne des en-têtes
          <input
            type="number"
            min={1}
            value={headerRow ?? job.headerRow}
            onChange={(e) => setHeaderRow(Math.max(1, Number(e.target.value)))}
            className="field h-9 w-20"
          />
        </label>
        <ImportPreview job={job} />
      </Card>
      {editable && (
        <Card title="Décrire les colonnes">
          <DescriptionForm
            key={`${job.headerRow}-${headerRow ?? ''}`}
            columns={job.columns}
            headerRow={headerRow ?? job.headerRow}
            indicators={indicators}
            current={job.description}
            format={job.format}
            pending={describe.isPending}
            reasons={describe.error ? reasonsOf(describe.error) : []}
            onSubmit={(d) => describe.mutate(d)}
          />
        </Card>
      )}
      <Card
        title="Contrôle"
        action={
          editable && job.description ? (
            <Button
              disabled={validate.isPending}
              onClick={() => validate.mutate(undefined)}
            >
              {validate.isPending ? 'Contrôle…' : 'Lancer le contrôle'}
            </Button>
          ) : undefined
        }
      >
        <Notice reasons={validate.error ? reasonsOf(validate.error) : []} />
        <ControlReport job={job} />
      </Card>
      <Card title="Publication">
        <div className="space-y-5">
          {editable && job.state === 'validated' && member && (
            <PublishActions
              canPreprint={can(member.role, 'preprint')}
              pending={submit.isPending || preprint.isPending}
              onSubmit={() => submit.mutate(job.version.id)}
              onPreprint={() => preprint.mutate(job.version.id)}
            />
          )}
          <Notice
            reasons={[submit.error, preprint.error]
              .filter(Boolean)
              .flatMap(reasonsOf)}
          />
          <VersionHistory events={history.data?.events ?? []} />
        </div>
      </Card>
    </>
  )
}
