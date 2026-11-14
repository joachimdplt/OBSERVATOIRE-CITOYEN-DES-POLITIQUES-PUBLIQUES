/**
 * Remplir la phrase de lecture d'un indicateur : le nom du territoire et la
 * valeur, telle que publiée. Sans phrase, rien n'est inventé : on renvoie null.
 */
export function readingOf(
  template: string | null,
  territory: string,
  value: string,
): string | null {
  if (!template) return null
  return template
    .replaceAll('{territoire}', territory)
    .replaceAll('{valeur}', value)
}
