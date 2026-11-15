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
        'Les grands sujets de la grille internationale du Comparative Agendas Project : pour chacun, les chapitres des programmes des candidats à la présidentielle 2027, cités mot pour mot.',
    }),
  }),
  component: SubjectsPage,
})

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

/**
 * Les sujets : les grands sujets de la grille internationale du
 * Comparative Agendas Project, en sommaire. Chacun ouvre les chapitres des
 * programmes qui en parlent, candidat par candidat.
 */
function SubjectsPage() {
  const data = Route.useLoaderData()
  if (!data) return null
  return (
    <main className="px-6 pt-16 pb-20 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <h1 className={`${DISPLAY} text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08]`}>
          De quoi parlent les programmes ?
        </h1>
        <p className={`mt-4 max-w-[68ch] text-[1.05rem] leading-relaxed ${MUTED}`}>
          Les grands sujets d’une grille internationale, utilisée par des
          chercheurs de nombreux pays pour ranger programmes, lois et discours.
          Chaque sujet ouvre les chapitres des programmes qui en parlent, cités
          mot pour mot.
        </p>

        <nav className="mt-10 rounded-[28px] bg-white p-3">
          <ul className="grid gap-1 md:grid-cols-2 lg:grid-cols-3">
            {data.topics.map((t) => (
              <li key={t.code}>
                <Link
                  to="/sujets/grille/$code"
                  params={{ code: t.code }}
                  className="chapter-link no-underline"
                >
                  <span className="flex-1">{t.label}</span>
                  <ArrowRight size={14} className="shrink-0 self-center" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className={`mt-8 max-w-[80ch] text-[0.85rem] leading-relaxed ${MUTED}`}>
          Grille : Comparative Agendas Project, version {data.version}, licence{' '}
          {data.licence}. {data.citation} {data.translation}
        </p>
      </div>
    </main>
  )
}
