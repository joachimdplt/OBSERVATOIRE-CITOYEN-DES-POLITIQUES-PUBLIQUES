import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Highlight, plain } from '../components/atoms/Highlight'
import { DEVELOPERS } from '../data/developers'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/developpeurs')({
  head: () => ({
    meta: seo({
      title: plain(DEVELOPERS.hero.title),
      description: DEVELOPERS.hero.lead,
    }),
  }),
  component: Developers,
})

const MUTED = 'text-[#5B6470]'
const DISPLAY = 'font-extrabold tracking-[-0.03em] text-[#0B1A2A]'

function Block({
  children,
  soft = false,
}: {
  children: ReactNode
  soft?: boolean
}) {
  return (
    <section
      className={`px-6 py-24 md:px-10 ${soft ? 'bg-[#F4F6F8]' : 'bg-white'}`}
    >
      <div className="mx-auto w-full max-w-[1280px]">{children}</div>
    </section>
  )
}

function Title({ text, lead }: { text: string; lead?: string }) {
  return (
    <div className="max-w-[760px]">
      <h2
        className={`${DISPLAY} text-[clamp(1.8rem,3.2vw,2.6rem)] leading-[1.15]`}
      >
        <Highlight text={text} />
      </h2>
      {lead && (
        <p className={`mt-4 text-[1.08rem] leading-relaxed ${MUTED}`}>{lead}</p>
      )}
    </div>
  )
}

/**
 * La page des développeurs : comment l'observatoire est construit, et comment
 * lire ses données par l'API publique.
 */
function Developers() {
  const { hero, architecture, chemin, alimentation, api, regles, licences } =
    DEVELOPERS
  return (
    <>
      <section className="bg-white px-6 pt-24 pb-16 md:px-10">
        <div className="mx-auto max-w-[1280px]">
          <h1
            className={`${DISPLAY} max-w-[16ch] text-[clamp(2.4rem,5.4vw,4.2rem)] leading-[1.06]`}
          >
            <Highlight text={hero.title} />
          </h1>
          <p
            className={`mt-6 max-w-[56ch] text-[1.2rem] leading-relaxed ${MUTED}`}
          >
            {hero.lead}
          </p>
        </div>
      </section>

      <Block soft>
        <Title text={architecture.title} lead={architecture.lead} />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {architecture.blocks.map((b) => (
            <div
              key={b.name}
              className="rounded-[24px] bg-white p-6 shadow-[0_0_0_1px_rgba(11,26,42,0.1)]"
            >
              <code className="rounded-md bg-[#0B1A2A] px-2 py-1 text-sm font-semibold text-white">
                {b.name}
              </code>
              <p className={`${DISPLAY} mt-4 text-[1.2rem]`}>{b.role}</p>
              <p className={`mt-2 text-[0.95rem] leading-relaxed ${MUTED}`}>
                {b.stack}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[24px] bg-[#0B1A2A] p-6 text-center text-white">
          <code className="text-sm font-semibold">PostgreSQL 17</code>
          <p className="mt-1 text-[0.95rem] text-white/70">
            Une seule base, lue par l’API seulement.
          </p>
        </div>
      </Block>

      <Block>
        <Title text={chemin.title} />
        <ol className="mt-10 grid gap-5 md:grid-cols-5">
          {chemin.steps.map((step, i) => (
            <li key={step.title} className="space-y-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#0B1A2A] text-sm font-extrabold text-white">
                {i + 1}
              </span>
              <p className={`${DISPLAY} text-[1.1rem]`}>{step.title}</p>
              <p className={`text-[0.92rem] leading-relaxed ${MUTED}`}>
                {step.text}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-12 rounded-[24px] bg-[#F4F6F8] p-6 md:p-8">
          <p className="font-extrabold text-[#0B1A2A]">
            {chemin.guarantees.title}
          </p>
          <ul className={`mt-4 space-y-2 text-[0.98rem] ${MUTED}`}>
            {chemin.guarantees.items.map((g) => (
              <li key={g} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0B1A2A]" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </Block>

      <Block soft>
        <Title text={alimentation.title} lead={alimentation.lead} />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {alimentation.ways.map((w) => (
            <div
              key={w.title}
              className="rounded-[24px] bg-white p-6 shadow-[0_0_0_1px_rgba(11,26,42,0.1)]"
            >
              <p className={`${DISPLAY} text-[1.2rem]`}>{w.title}</p>
              <p className={`mt-2 text-[0.95rem] leading-relaxed ${MUTED}`}>
                {w.text}
              </p>
              <p className="mt-4 inline-flex rounded-full px-3 py-1 text-[0.78rem] font-bold text-[#0B1A2A] ring-1 ring-[#0B1A2A]/15">
                {w.label}
              </p>
            </div>
          ))}
        </div>
        <p className={`mt-6 text-sm ${MUTED}`}>{alimentation.doc}</p>
      </Block>

      <Block>
        <Title text={api.title} lead={api.lead} />
        <ul className="mt-10 divide-y divide-[#0B1A2A]/10 rounded-[24px] bg-white shadow-[0_0_0_1px_rgba(11,26,42,0.1)]">
          {api.routes.map((r) => (
            <li key={r.path} className="space-y-1.5 p-5 md:p-6">
              <p className="flex flex-wrap items-center gap-2 font-mono text-[0.9rem] text-[#0B1A2A]">
                <span className="rounded-md bg-[#0B1A2A] px-2 py-0.5 text-[0.75rem] font-bold text-white">
                  GET
                </span>
                <span className="break-all">{r.path}</span>
              </p>
              <p className={`text-[0.95rem] ${MUTED}`}>{r.text}</p>
              {r.query && (
                <p className="font-mono text-[0.8rem] text-[#5B6470]">
                  ?{r.query}
                </p>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-8 overflow-hidden rounded-[24px] bg-[#0B1A2A] text-white">
          <pre className="overflow-x-auto border-b border-white/10 p-5 text-[0.85rem]">
            <code>{api.example.request}</code>
          </pre>
          <pre className="overflow-x-auto p-5 text-[0.8rem] leading-relaxed text-white/80">
            <code>{api.example.response}</code>
          </pre>
        </div>
        <ul className={`mt-8 space-y-2 text-[0.98rem] ${MUTED}`}>
          {api.notes.map((n) => (
            <li key={n} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0B1A2A]" />
              {n}
            </li>
          ))}
        </ul>
      </Block>

      <Block>
        <Title text={regles.title} lead={regles.lead} />
        <ul className="mt-8 max-w-[820px]">
          {regles.items.map((rule) => (
            <li
              key={rule.label}
              className="flex flex-col gap-1 border-b border-[#0B1A2A]/10 py-4 sm:flex-row sm:justify-between sm:gap-6"
            >
              <span className="font-extrabold text-[#0B1A2A]">
                {rule.label}
              </span>
              <span className={`sm:text-right ${MUTED}`}>{rule.text}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block soft>
        <Title text={licences.title} />
        <ul className="mt-8 max-w-[760px]">
          {licences.items.map((l) => (
            <li
              key={l.label}
              className="flex flex-col gap-1 border-b border-[#0B1A2A]/10 py-4 sm:flex-row sm:justify-between sm:gap-6"
            >
              <span className="font-extrabold text-[#0B1A2A]">{l.label}</span>
              <span className={MUTED}>{l.text}</span>
            </li>
          ))}
        </ul>
      </Block>
    </>
  )
}
