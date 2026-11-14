import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card } from '../../components/atoms/Card'
import { PageHeader } from '../../components/atoms/PageHeader'
import { StatusBadge } from '../../components/atoms/StatusBadge'
import { NewPublicationForm } from '../../components/organisms/publications/NewPublicationForm'
import { PILLAR_LABELS } from '../../data/labels'
import { PUBLICATION_STATES } from '../../data/publication-states'
import {
  useCreatePublication,
  usePublications,
} from '../../hooks/publications/usePublications'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/publications/')({
  component: PublicationsPage,
})

/** Les publications de l'observatoire, et l'ouverture d'une nouvelle. */
function PublicationsPage() {
  const publications = usePublications()
  const create = useCreatePublication()
  const navigate = useNavigate()
  return (
    <>
      <PageHeader
        title="Publications"
        lead="Un enjeu lu maillon par maillon, avec les indicateurs vérifiés choisis pour chacun. Une publication se relit avant d’être publiée."
      />
      <Card title="Publications">
        {publications.data && publications.data.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {publications.data.map((p) => {
              const latest = p.versions[0]
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <Link
                    to="/publications/$slug"
                    params={{ slug: p.slug }}
                    className="space-y-0.5"
                  >
                    <span className="block text-sm font-medium text-slate-900 hover:underline">
                      {latest.title}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {PILLAR_LABELS[p.pillar]} · /enjeux/{p.slug}
                    </span>
                  </Link>
                  <span className="flex gap-1.5">
                    {p.versions.slice(0, 2).map((v) => (
                      <StatusBadge
                        key={v.id}
                        tone={PUBLICATION_STATES[v.state].tone}
                      >
                        {`n° ${v.number} · ${PUBLICATION_STATES[v.state].label}`}
                      </StatusBadge>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Aucune publication.</p>
        )}
      </Card>
      <Card title="Ouvrir une publication">
        <NewPublicationForm
          pending={create.isPending}
          reasons={create.error ? reasonsOf(create.error) : []}
          onSubmit={(values) =>
            create.mutate(values, {
              onSuccess: (p) =>
                navigate({
                  to: '/publications/$slug',
                  params: { slug: p.slug },
                }),
            })
          }
        />
      </Card>
    </>
  )
}
