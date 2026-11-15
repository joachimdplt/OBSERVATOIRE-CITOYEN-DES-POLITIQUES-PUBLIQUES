import { createFileRoute } from '@tanstack/react-router'
import { TopicTreemap } from '../components/organisms/topics/TopicTreemap'
import { listTopics } from '../services/public-api'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/sujets/')({
  loader: async () => (await listTopics()) ?? null,
  head: () => ({
    meta: seo({
      title: 'Sujets',
      description:
        'Les sujets des programmes des candidats à la présidentielle 2027 : pour chacun, qui en parle et combien de fois, cité mot pour mot.',
    }),
  }),
  component: TopicsPage,
})

const MUTED = 'text-[#5B6470]'

/**
 * Les enjeux : les sujets des programmes, en une mosaïque à deux niveaux.
 * La case d'un sujet est proportionnelle à son nombre de passages ; dans la
 * case, la photo d'un candidat l'est à ses passages sur le sujet.
 */
function TopicsPage() {
  const data = Route.useLoaderData()
  if (!data) return null
  const { topics } = data
  return (
    <main className="px-6 pt-16 pb-20 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          De quoi parlent les programmes ?
        </h1>

        <div className="mt-10">
          <TopicTreemap topics={topics} />
        </div>

        <p
          className={`mt-8 max-w-[80ch] text-[0.85rem] leading-relaxed ${MUTED}`}
        >
          Un passage compte quand il contient l’un des termes publiés du sujet,
          les mêmes pour tous. La taille dit combien un programme en parle, pas
          ce qu’il propose ni ce qu’il vaut ; un programme partiel en dit moins
          par construction.
        </p>
      </div>
    </main>
  )
}
