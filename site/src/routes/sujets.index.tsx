import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { getCapTopics } from '../services/public-api'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/sujets/')({
  loader: async () => (await getCapTopics()) ?? null,
  head: () => ({
    meta: seo({
      title: 'Sujets',
      description:
        'Les 21 grands sujets de la grille internationale du Comparative Agendas Project : pour chacun, ce que disent les programmes des candidats à la présidentielle 2027, cité mot pour mot.',
    }),
  }),
  component: SubjectsPage,
})

const MUTED = 'text-[#5B6470]'

/**
 * Les sujets : les 21 grands sujets de la grille internationale du
 * Comparative Agendas Project, en liste. Chacun ouvre ce que les programmes
 * en disent, candidat par candidat.
 */
function SubjectsPage() {
  const data = Route.useLoaderData()
  if (!data) return null
  return (
    <main className="px-6 pt-16 pb-20 md:px-10">
      <div className="mx-auto max-w-[880px]">
        <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          Sujets
        </h1>
        <p className={`mt-4 max-w-[64ch] text-[1.05rem] leading-relaxed ${MUTED}`}>
          Les grands sujets de la grille internationale du Comparative Agendas
          Project, utilisée par des chercheurs de nombreux pays pour ranger
          programmes, lois et discours. Chaque sujet ouvre les chapitres des
          programmes qui en parlent, cités mot pour mot.
        </p>

        <ul className="mt-10 divide-y divide-[#0B1A2A]/8 border-y border-[#0B1A2A]/8 bg-white">
          {data.topics.map((t) => (
            <li key={t.code}>
              <Link
                to="/sujets/grille/$code"
                params={{ code: t.code }}
                className="group flex items-center justify-between gap-4 px-5 py-4 no-underline"
              >
                <span className="text-[1.1rem] font-bold text-[#0B1A2A] group-hover:underline">
                  {t.label}
                </span>
                <ArrowRight size={18} className="shrink-0 text-[#0B1A2A]" />
              </Link>
            </li>
          ))}
        </ul>

        <p className={`mt-8 max-w-[80ch] text-[0.85rem] leading-relaxed ${MUTED}`}>
          Grille : Comparative Agendas Project, version {data.version}, licence{' '}
          {data.licence}. {data.citation} {data.translation}
        </p>
      </div>
    </main>
  )
}
