export type ReviewMethod =
  | 'grille'
  | 'voisins'
  | 'classeur'
  | 'modele'
  | 'titre'
  | 'rubrique'

/** Un rangement sur lequel les méthodes ne sont pas d'accord. */
export type ReviewItem = {
  id: string
  candidate: string
  heading: string
  document: { title: string; url: string }
  passages: { quote: string; page: number | null }[]
  proposals: { method: ReviewMethod; code: string | null; label: string | null }[]
  spread: number
}

export type SubjectReview = {
  total: number
  topics: { code: string; label: string }[]
  items: ReviewItem[]
}
