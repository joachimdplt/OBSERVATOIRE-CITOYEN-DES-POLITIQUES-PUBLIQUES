import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PublicationSheet } from '../../../types/public'
import { CollectedTexts } from './CollectedTexts'
import { MeasureComparison } from './MeasureComparison'
import { MeasureList } from './MeasureList'

/**
 * Au Parlement : les textes déposés sur l'enjeu, groupe par groupe, en
 * complément des programmes des candidats. Le bloc se replie par défaut ; il
 * s'ouvre seul quand on arrive par le lien d'une mesure.
 */
export function ParliamentBlock({ article }: { article: PublicationSheet }) {
  const reviewed = article.sections.flatMap((s) => s.measures)
  const count = reviewed.length + article.collected.length
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (window.location.hash.startsWith('#mesure-')) setOpen(true)
  }, [])
  if (count === 0) return null
  return (
    <section className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-[1280px] rounded-[28px] bg-white">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 p-6 text-left md:p-8"
        >
          <span>
            <span className="block text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight font-extrabold tracking-[-0.03em] text-[#0B1A2A]">
              Au Parlement
            </span>
            <span className="mt-1 block text-[0.95rem] text-[#5B6470]">
              {count} textes déposés à l’Assemblée et au Sénat, groupe par
              groupe, cités mot pour mot.
            </span>
          </span>
          <ChevronDown
            size={24}
            className={`shrink-0 text-[#0B1A2A] transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && (
          <div className="border-t border-[#0B1A2A]/8 pb-6">
            <MeasureComparison
              sections={article.sections}
              collected={article.collected}
            />
            {article.sections
              .filter((s) => s.measures.length > 0)
              .map((s) => (
                <div key={s.title} className="mx-auto max-w-[1120px] px-6">
                  <p className="mt-8 font-extrabold text-[#0B1A2A]">
                    {s.title}
                  </p>
                  <MeasureList measures={s.measures} />
                </div>
              ))}
            <CollectedTexts texts={article.collected} />
          </div>
        )}
      </div>
    </section>
  )
}
