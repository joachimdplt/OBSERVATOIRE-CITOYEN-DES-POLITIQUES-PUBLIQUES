import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { pillarLabel } from '../data/pillars'
import { listTopics } from '../services/public-api'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/enjeux/')({
  loader: async () => (await listTopics()) ?? null,
  head: () => ({
    meta: seo({
      title: 'Enjeux',
      description:
        'Les enjeux dont parlent les programmes publiés des candidats à la présidentielle 2027, rangés par le nombre de programmes qui les abordent.',
    }),
  }),
  component: TopicsPage,
})

const MUTED = 'text-[#5B6470]'

/**
 * Les enjeux, rangés par le nombre de programmes publiés qui en parlent,
 * puis par le nombre de passages. Chaque ligne donne ses comptes ; les termes
 * recherchés sont sur la page de l'enjeu.
 */
function TopicsPage() {
  const data = Route.useLoaderData()
  if (!data) return null
  const { programmes, topics } = data
  return (
    <main>
      <section className="bg-white px-6 pt-16 pb-10 md:px-10">
        <div className="mx-auto max-w-[1120px]">
          <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
            Les enjeux dans les programmes
          </h1>
          <p
            className={`mt-5 max-w-[64ch] text-[1.1rem] leading-relaxed ${MUTED}`}
          >
            {programmes.candidates} candidats à la présidentielle 2027 ont
            publié un programme ({programmes.complete} complets,{' '}
            {programmes.partial} partiels). Chaque enjeu est cherché dans leurs
            textes par des termes publiés, les mêmes pour tous ; il est rangé
            par le nombre de programmes où un terme apparaît, puis par le nombre
            de passages.
          </p>
        </div>
      </section>
      <section className="bg-[#F4F6F8] px-6 py-12 md:px-10">
        <ol className="mx-auto max-w-[1120px] divide-y divide-[#0B1A2A]/8 rounded-[28px] bg-white px-6 md:px-8">
          {topics.map((t) => (
            <li key={t.slug}>
              <Link
                to="/enjeux/$slug"
                params={{ slug: t.slug }}
                className="group grid grid-cols-[3.2rem_minmax(0,1fr)_auto] items-center gap-4 py-4 no-underline"
              >
                <span className="text-[1.6rem] font-extrabold text-[#0B1A2A] tabular-nums">
                  {t.programmes}
                  <span className={`text-[0.85rem] font-semibold ${MUTED}`}>
                    /{programmes.candidates}
                  </span>
                </span>
                <span>
                  <span className="block font-bold text-[#0B1A2A] group-hover:underline">
                    {t.name}
                  </span>
                  <span className={`block text-[0.85rem] ${MUTED}`}>
                    {pillarLabel(t.pillar)} · {t.passages} passages
                    {t.publication ? ' · article publié' : ''}
                  </span>
                </span>
                <ArrowRight
                  size={17}
                  className="text-[#0B1A2A] transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ol>
        <p className={`mx-auto mt-6 max-w-[1120px] text-[0.88rem] ${MUTED}`}>
          Le chiffre de gauche compte les programmes où un terme de l’enjeu
          apparaît. Il dit de quoi les textes parlent, pas ce qu’ils proposent
          ni ce qu’ils valent.
        </p>
      </section>
    </main>
  )
}
