/** Défile en douceur jusqu'à la carte d'un candidat, sous l'en-tête. */
export function goTo(e: { preventDefault: () => void }, slug: string) {
  const target = document.getElementById(`candidat-${slug}`)
  if (!target) return
  e.preventDefault()
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#candidat-${slug}`)
}
