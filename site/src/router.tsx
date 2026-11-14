import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { Unavailable } from './components/molecules/Unavailable'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Les paramètres d'adresse restent du texte simple, lus et écrits comme
    // le navigateur le fait : « `?territory=13201` », jamais un nombre ni
    // « %2213201%22 ». Un lien partagé doit se lire, et un code garder son zéro.
    parseSearch: (search) => Object.fromEntries(new URLSearchParams(search)),
    stringifySearch: (search) => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(search)) {
        if (value !== undefined && value !== '') params.set(key, String(value))
      }
      const query = params.toString()
      return query ? `?${query}` : ''
    },
    // Toute page dont l'API ne répond pas le dit, au lieu d'un message technique.
    defaultErrorComponent: ({ error }) => {
      // La cause reste dans le journal du serveur ; le visiteur lit une phrase claire.
      console.error('[site]', error)
      return <Unavailable />
    },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
