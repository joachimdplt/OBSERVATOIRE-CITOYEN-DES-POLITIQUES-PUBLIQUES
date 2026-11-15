import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import type { Easing } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Highlight } from '../../atoms/Highlight'
import { HOME } from '../../../data/home'

const MUTED = 'text-[#5B6470]'
const NAVY = '#0B1A2A'

/** Un léger dépassement à l'arrivée, comme une pièce qu'on pose. */
const easeOutBack: Easing = [0.34, 1.56, 0.64, 1]

/** Un bloc qui entre en montant et en grandissant un peu, une fois. */
function Entree({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5, ease: easeOutBack, delay }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Comment ça marche, raconté dans l'ordre et tel que le site le fait
 * aujourd'hui : on suit chaque candidat, on lit tout ce qu'il publie, on
 * cite, on garde chaque version, on dit où il en est, vous lisez autour de
 * lui. Le bouton mène aux candidats, juste en dessous.
 *
 * Quand le bloc entre à l'écran, un cadre glisse d'un carré à l'autre et
 * chaque étape parcourue se remplit, puis le cadre va entourer le bouton
 * (repris du parcours des fiches d'airobotics, en monochrome). Sans animation
 * si le lecteur l'a demandé à son système.
 */
export function HomeSteps() {
  const { comment } = HOME
  const reduce = useReducedMotion()
  const list = useRef<HTMLOListElement>(null)
  const seen = useInView(list, { once: true, amount: 0.4 })
  const total = comment.steps.length
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (reduce) {
      setDone(total)
      return
    }
    if (!seen) return
    const ids = comment.steps.map((_, i) =>
      setTimeout(() => setDone(i + 1), 500 + i * 650),
    )
    return () => ids.forEach(clearTimeout)
  }, [seen, reduce, total, comment.steps])

  // Le cadre se pose sur l'étape en cours ; une fois les six parcourues, il
  // va entourer le bouton, la suite logique de la lecture.
  const onButton = done >= total
  const current = onButton ? -1 : done

  return (
    <section id="comment" className="scroll-mt-14 px-6 py-16 md:px-10">
      <div className="mx-auto max-w-[1280px] rounded-[36px] bg-white px-6 py-14 md:px-12 md:py-16">
        <Entree className="text-center">
          <h2 className="text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.15] font-extrabold tracking-[-0.03em] text-balance text-[#0B1A2A]">
            <Highlight text={comment.title} />
          </h2>
          <p
            className={`mx-auto mt-5 max-w-[56ch] text-[1.08rem] leading-relaxed md:text-[1.2rem] ${MUTED}`}
          >
            {comment.lead}
          </p>
        </Entree>

        <ol
          ref={list}
          className="mx-auto mt-14 grid max-w-[1080px] grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-8"
        >
          {comment.steps.map((step, i) => {
            const filled = i < done
            return (
              <li
                key={step.title}
                className="flex list-none flex-col items-center text-center"
              >
                <span className="relative">
                  <motion.span
                    className="flex size-20 items-center justify-center rounded-[14px] text-[2.2rem] font-extrabold tabular-nums md:size-24 md:text-[2.6rem]"
                    initial={false}
                    animate={{
                      backgroundColor: filled ? NAVY : '#F4F6F8',
                      color: filled ? '#FFFFFF' : 'rgba(11,26,42,0.35)',
                      scale: filled ? [1, 1.08, 1] : 1,
                    }}
                    transition={{ duration: 0.35 }}
                  >
                    {i + 1}
                  </motion.span>
                  {seen && i === current && (
                    <motion.span
                      layoutId="cadre-etape"
                      aria-hidden
                      className="absolute -inset-[7px] rounded-[19px] md:-inset-[9px] md:rounded-[21px]"
                      style={{ border: `4px solid ${NAVY}` }}
                      transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
                    />
                  )}
                </span>
                <p className="mt-6 text-[1.1rem] font-extrabold tracking-[-0.02em] text-[#0B1A2A] md:text-[1.3rem]">
                  {step.title}
                </p>
                <p
                  className={`mt-1 max-w-[28ch] text-[0.88rem] leading-snug md:text-[0.98rem] ${MUTED}`}
                >
                  {step.text}
                </p>
              </li>
            )
          })}
        </ol>

        <Entree
          delay={0.1}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
        >
          <span className="relative">
            <Link
              to="/"
              hash="candidats"
              className="inline-flex h-14 items-center gap-3 rounded-full bg-[#0B1A2A] px-7 text-[1.05rem] font-extrabold text-white no-underline hover:opacity-90"
            >
              {comment.cta}
              <ArrowRight size={18} strokeWidth={2.75} aria-hidden />
            </Link>
            {(seen || reduce) && onButton && (
              <motion.span
                layoutId="cadre-etape"
                aria-hidden
                className="pointer-events-none absolute -inset-[7px] rounded-full"
                style={{ border: `4px solid ${NAVY}` }}
                transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
              />
            )}
          </span>
          <Link
            to="/developpeurs"
            className="text-[0.95rem] font-bold text-[#0B1A2A] no-underline hover:underline"
          >
            {comment.technical}
          </Link>
        </Entree>
      </div>
    </section>
  )
}
