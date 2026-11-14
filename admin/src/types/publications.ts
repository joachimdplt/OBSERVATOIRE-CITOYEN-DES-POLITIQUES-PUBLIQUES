import type { Pillar } from './catalogue'

export type PublicationState =
  'draft' | 'in_review' | 'preprint' | 'published' | 'superseded'

/** Le texte d'une version, tel que l'éditeur l'écrit. */
export type PublicationContent = {
  title: string
  summary: string
  sections: {
    title: string
    text: string
    indicators: { code: string; justification: string }[]
  }[]
}

export type PublicationVersion = {
  id: string
  number: number
  state: PublicationState
  title: string
  summary: string
  createdBy: { name: string }
  submittedById: string | null
  submittedBy: { name: string } | null
  reviewedBy: { name: string } | null
  publishedAt: string | null
  sections: {
    title: string
    text: string
    indicators: {
      justification: string
      indicator: { code: string; label: string }
    }[]
  }[]
}

export type Publication = {
  id: string
  slug: string
  pillar: Pillar
  versions: PublicationVersion[]
}

export type NewPublication = {
  slug: string
  pillar: Pillar
  title: string
  summary: string
}

/** Le texte d'une version chargée, dans la forme de l'éditeur. */
export const contentOf = (v: PublicationVersion): PublicationContent => ({
  title: v.title,
  summary: v.summary,
  sections: v.sections.map((s) => ({
    title: s.title,
    text: s.text,
    indicators: s.indicators.map((x) => ({
      code: x.indicator.code,
      justification: x.justification,
    })),
  })),
})
