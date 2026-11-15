import type { ReactNode } from 'react'

/**
 * Un titre dont le passage entre [[ ]] est surligné : posé dans une pastille
 * navy, texte blanc. Aucune couleur de marque : un observatoire qui parle des
 * partis n'en porte aucune qui rappelle l'un d'eux.
 */
export function Highlight({
  text,
  dark = false,
}: {
  text: string
  /** Sur fond sombre : pastille blanche, texte navy. */
  dark?: boolean
}) {
  const parts = text.split(/\[\[(.+?)\]\]/)
  const out: ReactNode[] = []
  parts.forEach((part, i) =>
    out.push(
      i % 2 === 0 ? (
        part
      ) : (
        <span
          key={i}
          className={`rounded-[0.22em] px-[0.22em] [box-decoration-break:clone] ${
            dark ? 'bg-white text-[#0B1A2A]' : 'bg-[#0B1A2A] text-white'
          }`}
        >
          {part}
        </span>
      ),
    ),
  )
  return <>{out}</>
}

/** Le texte sans ses marques, pour une balise title ou une description. */
export const plain = (text: string) => text.replace(/\[\[(.+?)\]\]/g, '$1')
