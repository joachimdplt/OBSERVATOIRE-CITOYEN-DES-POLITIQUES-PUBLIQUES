import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { SiteFrame } from '../layouts/SiteFrame'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  // Les pages publiques changent une fois par jour (la collecte de 6 h) et
  // aux décisions de l'équipe : un CDN ou un cache les resert pendant cinq
  // minutes, et encore dix le temps d'en préparer une nouvelle.
  headers: () => ({
    'Cache-Control':
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Observatoire citoyen des politiques publiques' },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        href: '/icon-512.png',
      },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Sacramento&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="mx-auto max-w-[1280px] px-6 py-24 text-sm text-slate-500">
      Cette page n’existe pas.
    </div>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <SiteFrame>{children}</SiteFrame>
        <Scripts />
      </body>
    </html>
  )
}
