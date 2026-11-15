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
          Choisissez un sujet : vous lirez ce que chaque candidat en dit dans
          son programme, avec ses propres mots.
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

        <section className="mt-12 rounded-[28px] bg-white p-6 md:p-10">
          <h2 className="text-[1.1rem] font-extrabold text-[#0B1A2A]">
            D’où viennent ces sujets ?
          </h2>
          <div className={`mt-4 space-y-4 text-justify text-[0.95rem] leading-[1.75] hyphens-auto ${MUTED}`}>
            <p>
              Nous ne les avons pas inventés. Ils viennent d’une liste mise au
              point par des universitaires, le{' '}
              <a
                href="https://www.comparativeagendas.net/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#0B1A2A] hover:underline"
              >
                Comparative Agendas Project
              </a>
              .
            </p>
            <p>
              Des chercheurs de nombreux pays s’en servent pour ranger de la
              même façon les lois, les discours et les programmes.
            </p>
            <p>
              La liste originale est en anglais ; l’équipe de l’observatoire a
              traduit les intitulés en français.
            </p>
            <p>
              <Link
                to="/sources"
                hash="sujets"
                className="font-semibold text-[#0B1A2A] hover:underline"
              >
                Voir la référence complète et la licence
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
