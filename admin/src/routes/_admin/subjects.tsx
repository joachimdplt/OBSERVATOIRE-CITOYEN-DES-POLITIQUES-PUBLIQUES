import { createFileRoute } from '@tanstack/react-router'
import { Notice } from '../../components/atoms/Notice'
import { PageHeader } from '../../components/atoms/PageHeader'
import { SubjectReviewCard } from '../../components/organisms/subjects/SubjectReviewCard'
import {
  useDecideSubject,
  useSubjectReview,
} from '../../hooks/subjects/useSubjectReview'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/subjects')({
  component: SubjectsReviewPage,
})

/**
 * Les rangements où les trois méthodes ne sont pas d'accord, le plus
 * ambigu d'abord. Chaque décision est signée et sert d'exemple au modèle.
 */
function SubjectsReviewPage() {
  const review = useSubjectReview()
  const decide = useDecideSubject()
  return (
    <>
      <PageHeader
        title="Sujets à relire"
        lead="Les extraits sur lesquels la grille, les voisins et le modèle ne sont pas d’accord. Ils ne s’affichent pas sur le site tant que personne n’a tranché. Les plus ambigus viennent d’abord."
      />
      <Notice reasons={decide.error ? reasonsOf(decide.error) : []} />
      {review.data && (
        <>
          <p className="text-sm text-slate-500">
            {review.data.total} extrait{review.data.total > 1 ? 's' : ''} à
            relire
          </p>
          {review.data.items.length === 0 ? (
            <p className="surface p-8 text-center text-sm text-slate-500">
              Rien à relire : les méthodes sont d’accord partout.
            </p>
          ) : (
            <ul className="space-y-4">
              {review.data.items.slice(0, 20).map((item) => (
                <SubjectReviewCard
                  key={item.id}
                  item={item}
                  topics={review.data.topics}
                  pending={decide.isPending}
                  onDecide={(code, reason) =>
                    decide.mutate({ id: item.id, code, reason })
                  }
                />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
