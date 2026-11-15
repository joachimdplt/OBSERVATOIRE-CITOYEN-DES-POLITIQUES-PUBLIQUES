import { createFileRoute } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { getCapTopics } from '../services/public-api'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/sources')({
  loader: async () => (await getCapTopics().catch(() => null)) ?? null,
  head: () => ({
    meta: seo({
      title: 'Sources',
      description:
        'Les sources de l’observatoire : les programmes des candidats, la grille internationale des sujets et le modèle qui range les chapitres.',
    }),
  }),
  component: SourcesPage,
})

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

/**
 * Les sources : d'où vient chaque chose affichée sur le site, avec sa
 * référence et sa licence.
 */
function SourcesPage() {
  const cap = Route.useLoaderData()
  return (
    <main className="px-6 pt-16 pb-20 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <h1 className={`${DISPLAY} text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08]`}>
          Sources
        </h1>
        <p className={`mt-6 text-justify text-[1.05rem] leading-[1.75] hyphens-auto ${MUTED}`}>
          D’où vient chaque chose affichée sur le site, avec sa référence et sa
          licence.
        </p>

        <div className="mt-12 space-y-5">
          <Block id="programmes" title="Les programmes des candidats">
            <p>
              Les textes publiés par les candidats eux-mêmes : leurs programmes
              en document et les pages de leur site. Ils sont cités mot pour
              mot, sans être résumés ni reformulés, et chaque citation renvoie
              au document d’origine, à la page près pour un PDF.
            </p>
          </Block>

          <Block id="videos" title="Les vidéos">
            <p>
              Le candidat dans ses propres mots : ses vidéos, celles de son
              parti et ses interventions à l’Assemblée nationale et au Sénat.
            </p>
            <p>
              Les chaînes suivies sont celles du candidat et de son parti,
              quand leur site y renvoie, et celles de l’Assemblée nationale et
              du Sénat. Sur sa propre chaîne, toutes ses vidéos sont retenues ;
              sur celle de son parti ou d’une assemblée, seulement celles dont
              le titre donne son nom complet. Les vidéos sont collectées depuis
              le 1er janvier 2026.
            </p>
          </Block>

          <Block id="sujets" title="La grille des sujets">
            <p>
              Les sujets viennent de la grille du Comparative Agendas Project,
              une liste mise au point par des universitaires et utilisée par
              des chercheurs de nombreux pays pour ranger de la même façon les
              lois, les discours et les programmes.
            </p>
            <p>
              La liste originale est en anglais ; l’équipe de l’observatoire a
              traduit les intitulés en français.
            </p>
            <Facts
              rows={[
                ['Référence', cap?.citation ?? 'non documenté'],
                ['Version', cap?.version ?? 'non documenté'],
                [
                  'Licence',
                  `${cap?.licence ?? 'non documenté'} : réutilisation libre, sans usage commercial, en citant les auteurs.`,
                ],
                ['Traduction', 'Équipe de l’observatoire.'],
              ]}
            />
            <Out href="https://www.comparativeagendas.net/">
              Site du Comparative Agendas Project
            </Out>
          </Block>

          <Block id="rangement" title="Le rangement des chapitres">
            <p>
              Chaque chapitre d’un programme est rangé dans un sujet de la
              grille par un modèle de langue, Qwen3, qui tourne sur un
              ordinateur de l’équipe, sans envoyer les textes ailleurs. Il lit
              le titre et le début du chapitre et choisit un seul sujet. Les
              chapitres sans contenu précis (avant-propos, introduction…) ne
              sont pas rangés.
            </p>
            <p>
              Le modèle peut se tromper. Un rangement faux est retiré par
              l’équipe ; il ne change jamais le texte cité.
            </p>
            <p>
              Sur la page d’un sujet, les candidats apparaissent dans un ordre
              tiré au hasard à chaque visite : aucun n’est toujours en tête.
            </p>
            <Facts
              rows={[
                ['Modèle', 'Qwen3, 8 milliards de paramètres (qwen3:8b)'],
                ['Auteur', 'Équipe Qwen, Alibaba Cloud'],
                ['Licence', 'Apache 2.0'],
                ['Exécution', 'Ollama, sur un ordinateur de l’équipe'],
              ]}
            />
            <Out href="https://github.com/QwenLM/Qwen3">Qwen3 sur GitHub</Out>
          </Block>
        </div>
      </div>
    </main>
  )
}

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 rounded-[28px] bg-white p-6 md:p-10">
      <h2 className={`${DISPLAY} text-[1.4rem]`}>{title}</h2>
      <div className={`mt-4 space-y-4 text-justify text-[0.95rem] leading-[1.75] hyphens-auto ${MUTED}`}>
        {children}
      </div>
    </section>
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-2 rounded-[18px] bg-[#F4F6F8] p-5 text-left text-[0.88rem] sm:grid-cols-[140px_minmax(0,1fr)]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-bold text-[#0B1A2A]">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-semibold text-[#0B1A2A] hover:underline"
    >
      {children}
      <ArrowUpRight size={14} />
    </a>
  )
}
