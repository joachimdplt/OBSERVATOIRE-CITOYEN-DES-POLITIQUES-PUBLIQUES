import { createFileRoute } from '@tanstack/react-router'
import { Notice } from '../../components/atoms/Notice'
import { PageHeader } from '../../components/atoms/PageHeader'
import { ReviewQueue } from '../../components/organisms/reviews/ReviewQueue'
import {
  useApprove,
  useReject,
  useReviewQueue,
} from '../../hooks/reviews/useReviews'
import { useSession } from '../../hooks/session/useSession'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/reviews')({
  component: ReviewsPage,
})

function ReviewsPage() {
  const { data: member } = useSession()
  const queue = useReviewQueue()
  const approve = useApprove()
  const reject = useReject()
  const error = approve.error ?? reject.error
  return (
    <>
      <PageHeader
        title="Relecture"
        lead="Les versions soumises ou prépubliées qui attendent une décision. La décision est signée, publique, et ne s’efface pas."
      />
      <Notice reasons={error ? reasonsOf(error) : []} />
      {queue.data && member && (
        <ReviewQueue
          lines={queue.data}
          memberId={member.id}
          pending={approve.isPending || reject.isPending}
          onApprove={(id) => approve.mutate({ id })}
          onReject={(id, justification) => reject.mutate({ id, justification })}
        />
      )}
    </>
  )
}
