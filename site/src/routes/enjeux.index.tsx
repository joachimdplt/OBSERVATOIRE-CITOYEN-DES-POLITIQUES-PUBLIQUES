import { createFileRoute } from '@tanstack/react-router'
import { TopicTile } from '../components/organisms/topics/TopicMosaic'
import { listTopics } from '../services/public-api'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/enjeux/')({
  loader: async () => (await listTopics()) ?? null,
  head: () => ({
    meta: seo({
      title: 'Enjeux',
      description:
        'Les sujets des programmes des candidats à la présidentielle 2027 : pour chacun, qui en parle et combien de fois, cité mot pour mot.',
    }),
  }),
  component: TopicsPage,
})

const MUTED = 'text-[#5B6470]'

/**
 * Les enjeux : les sujets des programmes, en mosaïque. Chaque tuile montre
 * les candidats qui en parlent, la photo d'autant plus grande que le
 * candidat y consacre de passages. Les sujets abordés par le plus de
 * programmes viennent en premier.
 */
function TopicsPage() {
  const data = Route.useLoaderData()
  if (!data) return null
  const { programmes, topics } = data
  return (
    <main className="px-6 pt-16 pb-20 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          Les sujets des programmes
        </h1>
        <p
          className={`mt-4 max-w-[68ch] text-[1.08rem] leading-relaxed ${MUTED}`}
        >
          {topics.length} sujets, cherchés dans les {programmes.candidates}{' '}
          programmes publiés ({programmes.complete} complets,{' '}
          {programmes.partial} partiels). Dans chaque tuile, la photo d’un
          candidat grandit avec le nombre de ses passages sur le sujet.
        </p>

        <ul className="mt-10 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {topics.map((t) => (
            <li key={t.slug} className="min-w-0">
              <TopicTile topic={t} />
            </li>
          ))}
        </ul>

        <p
          className={`mt-8 max-w-[80ch] text-[0.85rem] leading-relaxed ${MUTED}`}
        >
          Un passage compte quand il contient l’un des termes publiés du sujet,
          les mêmes pour tous. La taille dit combien un programme en parle, pas
          ce qu’il propose ni ce qu’il vaut ; un programme partiel en dit moins
          par construction. Ordre : les sujets abordés par le plus de programmes
          d’abord.
        </p>
      </div>
    </main>
  )
}
