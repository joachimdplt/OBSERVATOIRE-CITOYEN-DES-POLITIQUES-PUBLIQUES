import { Play } from 'lucide-react'
import { useState } from 'react'

/** L'identifiant d'une vidéo YouTube dans son adresse. */
const idOf = (url: string) =>
  /[?&]v=([\w-]{11})/.exec(url)?.[1] ??
  /youtu\.be\/([\w-]{11})/.exec(url)?.[1] ??
  /\/(?:embed|shorts)\/([\w-]{11})/.exec(url)?.[1] ??
  null

/**
 * Une vidéo lue dans la page : sa miniature d'abord, le lecteur YouTube (sans
 * cookie) seulement au clic. La page reste légère même avec trente vidéos.
 */
export function VideoEmbed({
  url,
  title,
  thumbnail,
}: {
  url: string
  title: string
  thumbnail: string | null
}) {
  const [playing, setPlaying] = useState(false)
  const id = idOf(url)
  if (!id)
    return (
      <a href={url} target="_blank" rel="noreferrer">
        {title}
      </a>
    )
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[16px] bg-[#0B1A2A]">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Lire la vidéo : ${title}`}
          className="group absolute inset-0 size-full"
        >
          {thumbnail && (
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-opacity group-hover:opacity-90"
            />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-white/95 text-[#0B1A2A] shadow-lg transition-transform group-hover:scale-105">
              <Play size={22} fill="currentColor" className="ml-0.5" />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
