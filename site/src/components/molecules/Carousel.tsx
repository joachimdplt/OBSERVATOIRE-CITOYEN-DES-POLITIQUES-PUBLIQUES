import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Un carrousel horizontal : les éléments défilent au doigt ou aux flèches,
 * en s'arrêtant net sur chacun. Les flèches s'effacent aux extrémités.
 */
export function Carousel({ children }: { children: ReactNode[] }) {
  const track = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  useEffect(() => {
    const el = track.current
    if (!el) return
    const update = () =>
      setEdges({
        start: el.scrollLeft < 8,
        end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8,
      })
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const page = (dir: 1 | -1) => {
    const el = track.current
    if (el)
      el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <ul
        ref={track}
        className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto scroll-smooth px-6 pb-2 md:scroll-px-10 [scrollbar-width:none] md:-mx-10 md:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, i) => (
          <li
            key={i}
            className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[31.5%]"
          >
            {child}
          </li>
        ))}
      </ul>
      {!edges.start && (
        <button
          type="button"
          aria-label="Vidéos précédentes"
          onClick={() => page(-1)}
          className="absolute top-[30%] -left-3 hidden size-11 items-center justify-center rounded-full bg-white text-[#0B1A2A] shadow-[0_4px_16px_rgba(11,26,42,0.15)] md:flex"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {!edges.end && (
        <button
          type="button"
          aria-label="Vidéos suivantes"
          onClick={() => page(1)}
          className="absolute top-[30%] -right-3 hidden size-11 items-center justify-center rounded-full bg-white text-[#0B1A2A] shadow-[0_4px_16px_rgba(11,26,42,0.15)] md:flex"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  )
}
