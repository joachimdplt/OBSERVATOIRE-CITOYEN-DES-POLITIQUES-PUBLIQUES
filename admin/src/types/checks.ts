/** Un taux mesuré sur des cartes, avec son intervalle à 95 %. */
export type Rate =
  | { measured: false }
  | {
      measured: true
      right: number
      total: number
      rate: number
      low: number
      high: number
    }

/** Où en est la vérification d'un candidat. */
export type CheckProgress = {
  population: number
  target: number
  checked: number
  accepted: number
  refused: number
  /** Les refus pas encore rangés ailleurs ni écartés. */
  toReclass: number
  rate: Rate
  /** L'accord entre deux personnes, sur les rangements lus deux fois. */
  agreement: {
    pairs: number
    agreed: number
    rate: number
    kappa: number
  } | null
}

export type CandidateChecks = CheckProgress & {
  id: string
  name: string
  /** Lus par une autre personne, à relire par celle-ci. */
  secondReads: number
}

/** Une carte : un chapitre du candidat et le sujet donné par la machine. */
export type CheckCard = {
  id: string
  heading: string
  /** La section du document lue sur une image par l'équipe, avec sa provenance. */
  section?: { section: string; source: string } | null
  /** Ce que la machine a rangé : un passage seul, ou un chapitre. */
  unit: 'passage' | 'chapter'
  document: { title: string; url: string; fetchedAt: string }
  passages: { quote: string; page: number | null }[]
  topic: { code: string; label: string; subtopics: string[] }
  /** Déjà lue par une autre personne : seconde lecture, à l'aveugle. */
  secondReading?: boolean
}

export type NextCheck = {
  candidate: { id: string; name: string }
  progress: CheckProgress
  card: CheckCard | null
}

export type Verdict = 'accepted' | 'refused'

/** Le prochain refus à reclasser. */
export type NextReclass = {
  candidate: { id: string; name: string }
  left: number
  card: CheckCard | null
}

/** Un grand sujet de la grille et ses sous-sujets. */
export type GridTopic = {
  code: string
  label: string
  subtopics: GridSubtopic[]
}

/** Un sous-sujet, avec sa définition officielle et sa traduction. */
export type GridSubtopic = {
  code: string
  label: string
  /** La traduction française, vide si elle n'est pas faite. */
  definition: string | null
  translatedBy: 'person' | 'assistant' | null
  /** La définition officielle, en anglais : elle fait foi. */
  official: string | null
}
