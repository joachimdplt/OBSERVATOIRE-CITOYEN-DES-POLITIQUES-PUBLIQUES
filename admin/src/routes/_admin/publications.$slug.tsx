import { createFileRoute } from '@tanstack/react-router'
import { Breadcrumb } from '../../components/atoms/Breadcrumb'
import { Button } from '../../components/atoms/Button'
import { Card } from '../../components/atoms/Card'
import { Notice } from '../../components/atoms/Notice'
import { PageHeader } from '../../components/atoms/PageHeader'
import { StatusBadge } from '../../components/atoms/StatusBadge'
import { PublicationEditor } from '../../components/organisms/publications/PublicationEditor'
import { PUBLICATION_STATES } from '../../data/publication-states'
import { can } from '../../domain/roles'
import { useCatalogue } from '../../hooks/catalogue/useCatalogue'
import {
  useApprovePublication,
  useOpenDraft,
  usePreprintPublication,
  usePublications,
  useWriteDraft,
} from '../../hooks/publications/usePublications'
import { useSession } from '../../hooks/session/useSession'
import { contentOf } from '../../types/publications'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/publications/$slug')({
  component: PublicationPage,
})

/**
 * Une publication et ses versions. Le brouillon s'écrit ici, puis se
 * prépublie ; une version prépubliée se relit par une autre personne que son
 * auteur ; une correction ouvre une nouvelle version.
 */
function PublicationPage() {
  const { slug } = Route.useParams()
  const { data: member } = useSession()
  const publication = usePublications().data?.find((p) => p.slug === slug)
  const catalogue = useCatalogue().data
  const write = useWriteDraft()
  const preprint = usePreprintPublication()
  const approve = useApprovePublication()
  const open = useOpenDraft()
  const error = write.error ?? preprint.error ?? approve.error ?? open.error

  if (!publication || !member) return null
  const indicators = [
    ...new Map(
      (catalogue ?? [])
        .flatMap((p) => p.datasets.flatMap((d) => d.indicators))
        .map((i) => [i.code, i]),
    ).values(),
  ].sort((a, b) => a.label.localeCompare(b.label, 'fr'))
  const draft = publication.versions.find((v) => v.state === 'draft')
  const waiting = publication.versions.find(
    (v) => v.state === 'preprint' || v.state === 'in_review',
  )
  const latest = publication.versions[0]

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: 'Publications', to: '/publications' },
          { label: latest.title },
        ]}
      />
      <PageHeader title={latest.title} lead={`/enjeux/${publication.slug}`} />
      <Notice reasons={error ? reasonsOf(error) : []} />

      <Card title="Versions">
        <ul className="divide-y divide-slate-100 text-sm">
          {publication.versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <StatusBadge tone={PUBLICATION_STATES[v.state].tone}>
                {`n° ${v.number} · ${PUBLICATION_STATES[v.state].label}`}
              </StatusBadge>
              <span className="text-slate-600">
                ouverte par {v.createdBy.name}
                {v.submittedBy ? ` · prépubliée par ${v.submittedBy.name}` : ''}
                {v.reviewedBy ? ` · relue par ${v.reviewedBy.name}` : ''}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {waiting &&
            can(member.role, 'review') &&
            waiting.submittedById !== member.id && (
              <Button
                disabled={approve.isPending}
                onClick={() => approve.mutate(waiting.id)}
              >
                Approuver la version n° {waiting.number}
              </Button>
            )}
          {waiting && waiting.submittedById === member.id && (
            <p className="text-sm text-slate-500">
              La version n° {waiting.number} attend la relecture d’une autre
              personne.
            </p>
          )}
          {!draft && (
            <Button
              variant="secondary"
              disabled={open.isPending}
              onClick={() => open.mutate(publication.slug)}
            >
              Ouvrir une nouvelle version
            </Button>
          )}
        </div>
      </Card>

      {draft && (
        <Card
          title={`Brouillon n° ${draft.number}`}
          action={
            can(member.role, 'preprint') ? (
              <Button
                disabled={preprint.isPending}
                onClick={() => preprint.mutate(draft.id)}
              >
                Prépublier
              </Button>
            ) : undefined
          }
        >
          <PublicationEditor
            key={draft.id}
            initial={contentOf(draft)}
            indicators={indicators}
            pending={write.isPending}
            reasons={write.error ? reasonsOf(write.error) : []}
            onSave={(content) => write.mutate({ id: draft.id, content })}
          />
        </Card>
      )}
    </>
  )
}
