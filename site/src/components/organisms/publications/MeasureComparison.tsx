import type { CollectedText, PublicationSheet } from '../../../types/public'
import { frenchDate } from '../../../utils/date'

type Section = PublicationSheet['sections'][number]
type Measure = Section['measures'][number]

/** Le groupe d'un texte à la date du dépôt ; un projet de loi est du Gouvernement. */
export const groupOf = (m: Measure) =>
  m.document.authorGroup ??
  (m.document.firstAuthor === 'Gouvernement'
    ? 'Gouvernement'
    : 'Groupe non renseigné')

/** L'ancre d'une mesure dans la page, pour remonter à sa citation. */
export const measureAnchor = (m: Measure) =>
  `mesure-${m.document.number ?? 'x'}-${m.article}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')

/**
 * Le comparateur : les formations côte à côte sur les maillons d'un enjeu.
 * Une ligne par groupe, dans l'ordre alphabétique, une colonne par maillon ;
 * chaque case donne les mesures déposées, sans note ni verdict. Une case vide
 * dit seulement qu'aucun texte n'a été collecté, pas l'absence de position.
 */
/** Le groupe d'un texte collecté, au jour du dépôt. */
export const collectedGroup = (t: CollectedText) =>
  t.authorGroup ??
  (t.firstAuthor === 'Gouvernement' ? 'Gouvernement' : 'Groupe non renseigné')

/** L'ancre d'un texte collecté dans la page. */
export const collectedAnchor = (t: CollectedText) =>
  `texte-${t.chamber ?? 'x'}-${t.number ?? 'x'}`

export function MeasureComparison({
  sections,
  collected = [],
  href = '',
  title = 'Les textes déposés, groupe par groupe',
}: {
  sections: Section[]
  /** Les textes collectés automatiquement, non relus, en dernière colonne. */
  collected?: CollectedText[]
  /** La page de l'enjeu, quand le tableau s'affiche ailleurs (sous la carte). */
  href?: string
  title?: string
}) {
  const withMeasures = sections.filter((s) => s.measures.length > 0)
  if (withMeasures.length === 0 && collected.length === 0) return null
  const groups = [
    ...new Set([
      ...withMeasures.flatMap((s) => s.measures.map(groupOf)),
      ...collected.map(collectedGroup),
    ]),
  ].sort((a, b) => a.localeCompare(b, 'fr'))

  return (
    <section className="px-6 py-14 md:px-10">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="text-[1.6rem] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          {title}
        </h2>
        <p className="mt-2 max-w-[62ch] text-[0.98rem] leading-relaxed text-[#5B6470]">
          Une ligne par groupe du premier signataire, à la date du dépôt ; un
          texte peut être cosigné par des membres d’autres groupes. Une case
          vide signifie qu’aucun texte n’a été collecté, pas l’absence de
          position.
        </p>
        <div className="mt-8 overflow-x-auto rounded-[24px] glass">
          <table className="w-full min-w-[860px] border-collapse text-left text-[0.9rem]">
            <thead>
              <tr className="bg-[#F4F6F8]">
                <th className="w-[22%] p-4 font-extrabold text-[#0B1A2A]">
                  Groupe du premier signataire
                </th>
                {withMeasures.map((s) => (
                  <th
                    key={s.title}
                    className="p-4 font-extrabold text-[#0B1A2A]"
                  >
                    {s.title}
                  </th>
                ))}
                {collected.length > 0 && (
                  <th className="p-4 font-extrabold text-[#0B1A2A]">
                    Autres textes déposés
                    <span className="block text-[0.75rem] font-semibold text-[#5B6470]">
                      collectés automatiquement, non relus
                    </span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr
                  key={group}
                  className="border-t border-[#0B1A2A]/10 align-top"
                >
                  <th className="p-4 font-bold text-[#0B1A2A]">{group}</th>
                  {withMeasures.map((s) => {
                    const own = s.measures.filter((m) => groupOf(m) === group)
                    return (
                      <td key={s.title} className="p-4">
                        {own.length === 0 ? (
                          <span className="text-[#5B6470]/70">
                            aucun texte collecté
                          </span>
                        ) : (
                          <ul className="space-y-3">
                            {/* Un même article peut être cité deux fois dans
                                une case : l'index garde chaque ligne unique. */}
                            {own.map((m, k) => (
                              <li key={`${measureAnchor(m)}-${k}`}>
                                <a
                                  href={`${href}#${measureAnchor(m)}`}
                                  className="font-semibold text-[#0B1A2A] no-underline hover:underline"
                                >
                                  {m.label}
                                </a>
                                <span className="block text-[0.78rem] text-[#5B6470]">
                                  {m.document.kind === 'law' ? 'Loi' : 'Texte'}{' '}
                                  n° {m.document.number} ·{' '}
                                  {m.document.firstAuthor}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    )
                  })}
                  {collected.length > 0 && (
                    <td className="p-4">
                      {collected.some((t) => collectedGroup(t) === group) ? (
                        <ul className="space-y-3">
                          {collected
                            .filter((t) => collectedGroup(t) === group)
                            .map((t) => (
                              <li key={collectedAnchor(t)}>
                                <a
                                  href={`${href}#${collectedAnchor(t)}`}
                                  className="font-semibold text-[#0B1A2A] no-underline hover:underline"
                                >
                                  {t.title.replace(/^Proposition de loi /, '')}
                                </a>
                                <span className="block text-[0.78rem] text-[#5B6470]">
                                  n° {t.number} · {frenchDate(t.filedAt)} ·{' '}
                                  {t.firstAuthor}
                                </span>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <span className="text-[#5B6470]/70">
                          aucun texte collecté
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
