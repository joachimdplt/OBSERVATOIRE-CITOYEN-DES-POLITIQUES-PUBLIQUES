/**
 * Un ordre tiré au hasard (Fisher-Yates), dont le premier n'est jamais
 * `avoid` quand un autre est possible : aucun candidat n'ouvre la liste deux
 * fois de suite pour un même lecteur.
 */
export function shuffleAvoidingFirst<T extends { slug: string }>(
  list: T[],
  avoid: string | undefined,
  random: () => number = Math.random,
): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  if (out.length > 1 && out[0].slug === avoid) {
    const j = 1 + Math.floor(random() * (out.length - 1))
    ;[out[0], out[j]] = [out[j], out[0]]
  }
  return out
}
