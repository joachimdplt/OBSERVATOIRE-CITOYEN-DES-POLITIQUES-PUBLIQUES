import { createFileRoute } from '@tanstack/react-router'
import { Notice } from '../../components/atoms/Notice'
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
  const total = review.data?.total ?? 0
  return (
    <>
      <div className="flex items-baseline gap-3">
        {review.data && (
          <span className="text-sm text-[#5B6470]">
            {total === 0
              ? 'rien en attente'
              : `${total} chapitre${total > 1 ? 's' : ''} où le vote ne s’est pas accordé, pas affichés sur le site`}
          </span>
        )}
      </div>
      <Notice reasons={decide.error ? reasonsOf(decide.error) : []} />
      {review.data && review.data.items.length > 0 && (
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
  )
}
