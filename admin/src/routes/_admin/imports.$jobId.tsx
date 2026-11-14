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
import { useCatalogue } from '../../hooks/catalogue/useCatalogue'
import {
  useDescribe,
  useImportJob,
  useValidate,
} from '../../hooks/imports/useImports'
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
    </>
  )
}
