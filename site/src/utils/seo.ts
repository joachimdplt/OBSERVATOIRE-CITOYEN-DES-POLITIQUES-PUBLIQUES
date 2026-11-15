/** L'adresse publique du site : les aperçus de partage veulent une image en adresse complète. */
const ORIGIN =
  (import.meta.env.VITE_SITE_ORIGIN as string | undefined) ??
  'http://localhost:3002'

/** L'image d'aperçu : le coq qui observe les données, 1200 × 630. */
export const OG_IMAGE = `${ORIGIN}/og.png`

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
    { property: 'og:site_name', content: 'Observatoire citoyen' },
    { property: 'og:locale', content: 'fr_FR' },
    { property: 'og:image', content: OG_IMAGE },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    {
      property: 'og:image:alt',
      content: 'Un coq qui observe un graphique à la loupe',
    },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: OG_IMAGE },
    { name: 'theme-color', content: '#0B1A2A' },
  ]
}
