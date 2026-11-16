import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Highlight } from '../../atoms/Highlight'
import { HOME } from '../../../data/home'

/** Le temps passé sur chaque étape, en millisecondes. */
const STEP_MS = 2600

/**
 * Comment ça marche, en un seul carré : il passe d'une étape à l'autre,
 * le chiffre et la phrase changent en glissant. Les points dessous disent
 * où on en est et permettent d'aller à une étape ; la souris sur le carré
 * met en pause. Sans défilement si le lecteur a demandé moins d'animation.
 */
export function HomeSteps() {
  const { comment } = HOME
  const steps = comment.steps
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const seen = useInView(box, { amount: 0.5 })
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduce || !seen || paused) return
    const id = setInterval(
      () => setCurrent((c) => (c + 1) % steps.length),
      STEP_MS,
    )
    return () => clearInterval(id)
  }, [reduce, seen, paused, steps.length])

  const step = steps[current]
  const slide = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 18, filter: 'blur(4px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, y: -18, filter: 'blur(4px)' },
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
      }

  return (
    <section id="comment" className="scroll-mt-14 px-6 py-16 md:px-10">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center rounded-[36px] glass px-6 py-12">
        {/* Le carré et l'étape côte à côte, à la hauteur du carré. */}
        <div
          ref={box}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="flex items-stretch gap-6"
        >
          <motion.div
            key={current}
            initial={reduce ? false : { scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="glass-dark flex size-40 shrink-0 items-center justify-center rounded-[32px] md:size-48"
          >
            <span className="text-[4.2rem] font-extrabold text-white tabular-nums md:text-[5rem]">
              {current + 1}
            </span>
          </motion.div>

          <div className="flex w-[17rem] flex-col justify-between md:w-[36rem]">
            <h2 className="text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.1] font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
              <Highlight text={comment.title} />
            </h2>
            <AnimatePresence mode="wait">
              <motion.div key={current} {...slide}>
                <p className="text-[1.25rem] leading-tight font-extrabold tracking-[-0.02em] text-[#0B1A2A] md:text-[1.45rem]">
                  {step.title}
                </p>
                <p className="mt-1 text-[0.95rem] leading-snug text-[#5B6470] md:text-[1.05rem]">
                  {step.text}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="flex gap-2" role="tablist">
              {steps.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`${i + 1}. ${s.title}`}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? 'w-6 bg-[#0B1A2A]' : 'w-2 bg-[#0B1A2A]/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <Link
          to="/"
          hash="candidats"
          className="mt-10 inline-flex h-14 items-center gap-3 rounded-full glass-dark px-7 text-[1.05rem] font-extrabold text-white no-underline hover:opacity-90"
        >
          {comment.cta}
          <ArrowRight size={18} strokeWidth={2.75} aria-hidden />
        </Link>
      </div>
    </section>
  )
}
