import type { ReactNode } from 'react'

/**
 * Un titre dont le passage entre [[ ]] est surligné : posé dans une pastille
 * navy, texte blanc. Aucune couleur de marque : un observatoire qui parle des
 * partis n'en porte aucune qui rappelle l'un d'eux.
 */
export function Highlight({ text }: { text: string }) {
  const parts = text.split(/\[\[(.+?)\]\]/)
  const out: ReactNode[] = []
  parts.forEach((part, i) =>
    out.push(
      i % 2 === 0 ? (
        part
      ) : (
        <span
          key={i}
          className="rounded-[0.22em] bg-[#0B1A2A] px-[0.22em] text-white [box-decoration-break:clone]"
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
