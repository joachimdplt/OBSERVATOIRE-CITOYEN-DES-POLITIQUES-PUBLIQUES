import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { Unavailable } from './components/molecules/Unavailable'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Toute page dont l'API ne répond pas le dit, au lieu d'un message technique.
    defaultErrorComponent: Unavailable,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
