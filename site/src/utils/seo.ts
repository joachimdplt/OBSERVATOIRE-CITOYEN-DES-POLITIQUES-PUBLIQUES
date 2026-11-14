/** Le titre et la description d'une page, pour les moteurs et les aperçus de partage. */
export function seo({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const full = `${title} · Observatoire citoyen`
  return [
    { title: full },
    { name: 'description', content: description },
    { property: 'og:title', content: full },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ]
}
