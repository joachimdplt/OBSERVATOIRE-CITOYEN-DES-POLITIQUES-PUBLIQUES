import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import type { CandidateSubject } from '../../../types/public'
import { QuoteText } from '../../molecules/QuoteText'
import { ICONS } from '../subjects/SubjectDock'

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

/**
 * Le nom lisible d'un document : son titre, sauf quand ce titre est un nom
 * de fichier de mise en page (« LO_4PAGES_FINALOK-2.indd ») ; on lit alors
 * le nom du fichier publié (« Depliant NA 3nov »).
 */
export function documentLabel(title: string, url: string): string {
  if (!/\.(indd|pdf|docx?)$/i.test(title.trim())) return title
  const file = decodeURIComponent(url.split(/[?#]/)[0].split('/').pop() ?? '')
  return (file || title)
    .replace(/\.(pdf|indd|docx?)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
}

/**
 * Ce que dit un candidat, sujet par sujet, dans le verre de la page Sujets :
 * à gauche, une colonne collante de bulles (une icône et un nom par sujet,
 * dans l'ordre de la grille, sans compte) ; à droite, ses mots exacts dans
 * le sujet choisi, avec leur document et leur page. Sur petit écran, les
 * bulles défilent de côté.
 */
export function CandidateSubjects({
  subjects,
}: {
  subjects: CandidateSubject[]
}) {
  const [open, setOpen] = useState(subjects[0]?.code ?? null)
  if (subjects.length === 0) return null
  const current = subjects.find((s) => s.code === open) ?? subjects[0]
  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1120px]">
        <h2 className={`${DISPLAY} text-[clamp(1.6rem,3vw,2.2rem)]`}>
          Les sujets
        </h2>

        <div className="mt-8 grid gap-6 md:grid-cols-[250px_minmax(0,1fr)] md:items-start">
          <nav
            aria-label="Sujets"
            className="glass flex gap-1 overflow-x-auto rounded-[28px] p-2 md:sticky md:top-24 md:flex-col md:overflow-visible"
          >
            {subjects.map((s) => {
              const Icon = ICONS[s.code] as (typeof ICONS)[string] | undefined
              const active = s.code === current.code
              return (
                <button
                  key={s.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setOpen(s.code)}
                  className={`flex shrink-0 items-center gap-3 rounded-full py-1 pr-3 pl-1 text-left text-[0.88rem] font-semibold transition-colors ${
                    active ? 'text-[#0B1A2A]' : `${MUTED} hover:text-[#0B1A2A]`
                  }`}
                >
                  <span
                    className={`glass-bubble grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      active ? 'glass-bubble-active text-white' : ''
                    }`}
                  >
                    {Icon && <Icon size={17} strokeWidth={1.8} />}
                  </span>
                  <span className="whitespace-nowrap md:whitespace-normal">
                    {s.label}
                  </span>
                </button>
              )
            })}
          </nav>

          <div key={current.code} className="subject-enter space-y-3">
            <h3 className="text-left text-xl font-extrabold tracking-tight text-[#0B1A2A]">
              {current.label}
            </h3>
            <ul className="space-y-3">
              {current.passages.map((p, i) => (
                <li key={i} className="glass-text">
                  <QuoteText text={p.quote} />
                  <a
                    href={p.document.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-3 inline-flex items-center gap-1 text-left text-xs ${MUTED} no-underline hover:text-[#0B1A2A]`}
                  >
                    {documentLabel(p.document.title, p.document.url)}
                    {p.page ? `, p. ${p.page}` : ''}
                    <ArrowUpRight size={12} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
