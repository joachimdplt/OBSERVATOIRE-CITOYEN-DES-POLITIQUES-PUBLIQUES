import type { CandidatePhoto } from '../../types/public'

/**
 * La photo d'un candidat, la même pour tous : même cadre carré, en noir et
 * blanc (aucune couleur de campagne), créditée de son auteur et de sa
 * licence. Sans photo sous licence libre, le cadre le dit.
 */
export function CandidatePortrait({
  name,
  photo,
  className = '',
  plain = false,
}: {
  name: string
  photo: CandidatePhoto | null
  className?: string
  /** Sans la ligne de crédit (une petite carte) : le crédit passe en infobulle. */
  plain?: boolean
}) {
  const credit = photo
    ? `Photo ${photo.author ?? 'Wikimedia Commons'}${photo.licence ? `, ${photo.licence}` : ''}`
    : ''
  return (
    <figure className={`min-w-0 ${className}`}>
      {photo ? (
        <img
          src={photo.url}
          alt={`Photo de ${name}`}
          title={credit}
          loading="lazy"
          className="aspect-square w-full rounded-[18px] bg-[#E8ECF0] object-cover object-top grayscale"
        />
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[18px] bg-[#E8ECF0] px-4 text-center">
          <span className="text-[2rem] font-extrabold tracking-[-0.03em] text-[#0B1A2A]/40">
            {name
              .split(/[\s-]+/)
              .map((w) => w[0])
              .join('')
              .slice(0, 3)}
          </span>
          {!plain && (
            <span className="text-[0.75rem] text-[#5B6470]">
              Pas de photo sous licence libre
            </span>
          )}
        </div>
      )}
      {photo && !plain && (
        <figcaption className="mt-1.5 truncate text-[0.7rem] text-[#5B6470]">
          Photo{' '}
          <a
            href={photo.page ?? photo.url}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-[#0B1A2A]/20 underline-offset-2"
          >
            {photo.author ?? 'Wikimedia Commons'}
          </a>
          {photo.licence ? `, ${photo.licence}` : ''}
        </figcaption>
      )}
    </figure>
  )
}
