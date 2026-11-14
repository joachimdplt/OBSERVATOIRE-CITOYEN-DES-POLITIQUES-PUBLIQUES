/**
 * Une publication de l'observatoire : un enjeu, lu maillon par maillon avec
 * les indicateurs choisis pour chacun. Elle nomme et décrit ; elle ne pose
 * pas de question et ne suggère pas de réponse.
 */
export type PublicationContent = {
  title: string;
  summary: string;
  sections: {
    title: string;
    text: string;
    indicators: { code: string; justification: string }[];
  }[];
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** L'adresse publique d'une publication : `/enjeux/acces-aux-medecins`. Elle ne se renomme pas. */
export function readPublicationSlug(
  raw: string,
): { valid: true; slug: string } | { valid: false; reason: string } {
  const slug = raw.trim();
  if (slug.length < 3 || slug.length > 80 || !SLUG.test(slug))
    return {
      valid: false,
      reason:
        'Une adresse s’écrit en minuscules sans accent, chiffres et tirets, de 3 à 80 caractères : acces-aux-medecins.',
    };
  return { valid: true, slug };
}

/** Les erreurs du texte d'une publication ; vide s'il peut être enregistré. */
export function checkPublicationText(
  content: Pick<PublicationContent, 'title' | 'summary'>,
): string[] {
  const errors: string[] = [];
  const title = content.title.trim();
  if (!title) errors.push('Une publication a un titre.');
  if (title.length > 120) errors.push('Un titre tient en 120 caractères.');
  // Un titre nomme l'enjeu : une question suggère déjà une réponse.
  if (title.endsWith('?'))
    errors.push(
      'Un titre nomme l’enjeu, il ne pose pas de question : « Accès aux médecins généralistes ».',
    );
  if (!content.summary.trim()) errors.push('Une publication a un chapô.');
  return errors;
}

/**
 * Les erreurs qui empêchent de rendre une publication publique : chaque
 * maillon a un titre, un texte et au moins un indicateur, et chaque
 * indicateur choisi dit pourquoi il est là.
 */
export function checkPublicationContent(content: PublicationContent): string[] {
  const errors = checkPublicationText(content);
  if (content.sections.length === 0)
    errors.push('Une publication a au moins un maillon.');
  content.sections.forEach((section, i) => {
    const name = section.title.trim() || `n° ${i + 1}`;
    if (!section.title.trim())
      errors.push(`Le maillon n° ${i + 1} a un titre.`);
    if (section.title.trim().endsWith('?'))
      errors.push(`Le maillon « ${name} » nomme, il ne pose pas de question.`);
    if (!section.text.trim()) errors.push(`Le maillon « ${name} » a un texte.`);
    if (section.indicators.length === 0)
      errors.push(`Le maillon « ${name} » a au moins un indicateur.`);
    const codes = section.indicators.map((x) => x.code);
    if (new Set(codes).size !== codes.length)
      errors.push(`Un indicateur ne figure qu’une fois dans « ${name} ».`);
    for (const x of section.indicators)
      if (!x.justification.trim())
        errors.push(
          `L’indicateur ${x.code} dans « ${name} » dit pourquoi il est là.`,
        );
  });
  return errors;
}
