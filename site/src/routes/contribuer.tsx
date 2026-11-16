import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { CONTRIBUTE } from '../data/contribute'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/contribuer')({
  head: () => ({
    meta: seo({
      title: CONTRIBUTE.hero.title,
      description: CONTRIBUTE.hero.lead,
    }),
  }),
  component: ContributePage,
})

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'
const TEXT = `text-[0.95rem] leading-[1.75] ${MUTED}`

/**
 * Comment contribuer sans prendre parti : la règle, les façons de
 * contribuer et leur état, qui signe et qui relit, le parcours d'une
 * contribution, ce qui est refusé, et la porte des formations.
 */
function ContributePage() {
  const { hero, rule, ways, people, circuit, refused, contest, licence } =
    CONTRIBUTE
  return (
    <main className="px-4 pt-16 pb-20 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        <h1
          className={`${DISPLAY} text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.08]`}
        >
          {hero.title}
        </h1>
        <p className={`mt-6 max-w-3xl text-[1.05rem] leading-[1.75] ${MUTED}`}>
          {hero.lead}
        </p>

        <div className="mt-12 space-y-5">
          <Block id="regle" title={rule.title}>
            <div className="grid gap-4 md:grid-cols-3">
              {rule.items.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[18px] bg-[#F4F6F8] p-5"
                >
                  <p className={`${DISPLAY} text-[1.05rem]`}>{item.title}</p>
                  <p className={`mt-2 ${TEXT}`}>{item.text}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block id="facons" title={ways.title}>
            <div className="grid gap-4 md:grid-cols-2">
              {ways.items.map((way) => (
                <div
                  key={way.title}
                  className="flex flex-col rounded-[18px] border border-[#0B1A2A]/10 p-5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`${DISPLAY} text-[1.05rem]`}>{way.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold ${
                        way.open
                          ? 'bg-[#0B1A2A] text-white'
                          : 'bg-[#0B1A2A]/8 text-[#0B1A2A]/55'
                      }`}
                    >
                      {way.status}
                    </span>
                  </div>
                  <p className={`mt-2 ${TEXT}`}>{way.text}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block id="personnes" title={people.title}>
            {people.paragraphs.map((p) => (
              <p key={p} className={TEXT}>
                {p}
              </p>
            ))}
          </Block>

          <Block id="parcours" title={circuit.title}>
            <ol className="grid gap-4 md:grid-cols-4">
              {circuit.steps.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-[18px] bg-[#F4F6F8] p-5"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B1A2A] text-[0.85rem] font-bold text-white">
                    {i + 1}
                  </span>
                  <p className={`${DISPLAY} mt-4 text-[1.05rem]`}>
                    {step.title}
                  </p>
                  <p className={`mt-2 ${TEXT}`}>{step.text}</p>
                </li>
              ))}
            </ol>
          </Block>

          <Block id="refuse" title={refused.title}>
            <ul className="space-y-2">
              {refused.items.map((item) => (
                <li key={item} className={`flex gap-3 ${TEXT}`}>
                  <span aria-hidden className="text-[#0B1A2A]">
                    ×
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Block>

          <Block id="contester" title={contest.title}>
            {contest.paragraphs.map((p) => (
              <p key={p} className={TEXT}>
                {p}
              </p>
            ))}
          </Block>

          <Block id="licence" title={licence.title}>
            <p className={TEXT}>{licence.text}</p>
          </Block>
        </div>
      </div>
    </main>
  )
}

function Block({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-32 space-y-4 rounded-[28px] bg-white p-6 md:p-10"
    >
      <h2 className={`${DISPLAY} text-[1.4rem]`}>{title}</h2>
      {children}
    </section>
  )
}
