import type { PublicationSheet } from '../../../types/public'

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
export function MeasureComparison({
  sections,
  href = '',
  title = 'Les textes déposés, groupe par groupe',
}: {
  sections: Section[]
  /** La page de l'enjeu, quand le tableau s'affiche ailleurs (sous la carte). */
  href?: string
  title?: string
}) {
  const withMeasures = sections.filter((s) => s.measures.length > 0)
  if (withMeasures.length === 0) return null
  const groups = [
    ...new Set(withMeasures.flatMap((s) => s.measures.map(groupOf))),
  ].sort((a, b) => a.localeCompare(b, 'fr'))

  return (
    <section className="bg-white px-6 py-14 md:px-10">
      <div className="mx-auto max-w-[920px]">
        <h2 className="text-[1.6rem] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
          {title}
        </h2>
        <p className="mt-2 max-w-[62ch] text-[0.98rem] leading-relaxed text-[#5B6470]">
          Une ligne par groupe du premier signataire, à la date du dépôt ; un
          texte peut être cosigné par des membres d’autres groupes. Une case
          vide signifie qu’aucun texte n’a été collecté, pas l’absence de
          position.
        </p>
        <div className="mt-8 overflow-x-auto rounded-[24px] shadow-[0_0_0_1px_rgba(11,26,42,0.1)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-[0.9rem]">
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
                            {own.map((m) => (
                              <li key={measureAnchor(m)}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
