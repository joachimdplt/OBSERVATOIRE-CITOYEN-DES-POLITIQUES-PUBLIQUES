/** Une accélération puis un freinage, pour un défilement qui ne saute pas. */
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

let running = 0

/**
 * Fait défiler la page jusqu'à un élément, en douceur, en tenant compte de sa
 * marge de défilement (l'en-tête collant). La durée grandit un peu avec la
 * distance. Sans animation si le lecteur l'a demandé à son système.
 */
export function smoothScrollTo(el: HTMLElement) {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  const target = el.getBoundingClientRect().top + window.scrollY - margin
  const start = window.scrollY
  const distance = target - start
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, target)
    return
  }
  const duration = Math.min(1100, 450 + Math.abs(distance) * 0.12)
  const id = ++running
  const t0 = performance.now()
  const step = (now: number) => {
    if (id !== running) return
    const t = Math.min(1, (now - t0) / duration)
    window.scrollTo(0, start + distance * easeInOut(t))
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/** Défile en douceur jusqu'à la carte d'un candidat, sous l'en-tête. */
export function goTo(e: { preventDefault: () => void }, slug: string) {
  const target = document.getElementById(`candidat-${slug}`)
  if (!target) return
  e.preventDefault()
  smoothScrollTo(target)
  history.replaceState(null, '', `#candidat-${slug}`)
}

/**
 * À l'ouverture d'une page avec l'ancre d'un candidat (depuis la mosaïque
 * des sujets), on part du haut et on descend en douceur jusqu'à sa carte.
 */
export function scrollToHashedCandidate() {
  const hash = window.location.hash
  if (!hash.startsWith('#candidat-')) return
  const el = document.getElementById(hash.slice(1))
  if (!el) return
  window.scrollTo(0, 0)
  setTimeout(() => smoothScrollTo(el), 350)
}
