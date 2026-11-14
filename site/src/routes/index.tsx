import { createFileRoute } from '@tanstack/react-router'
import { plain } from '../components/atoms/Highlight'
import {
  HomeContribuer,
  HomeFiches,
  HomeFin,
  HomeHero,
  HomeParcours,
  HomePiliers,
} from '../components/organisms/home/HomeBlocks'
import { HOME } from '../data/home'
import { listIndicators } from '../services/public-api'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/')({
  loader: async () => ({
    indicators: (await listIndicators({ data: {} })) ?? [],
  }),
  head: () => ({
    meta: seo({
      title: 'Accueil',
      description: `${plain(HOME.hero.title).replace('\n', ' ')}. ${HOME.hero.lead}`,
    }),
  }),
  component: Home,
})

/**
 * L'accueil dans l'ordre du cahier des charges : le principe directeur, les
 * douze piliers, le parcours de référence, les fonctionnalités, la
 * contribution.
 */
function Home() {
  const { indicators } = Route.useLoaderData()
  return (
    <>
      <HomeHero />
      <HomePiliers indicators={indicators} />
      <HomeParcours />
      <HomeFiches />
      <HomeContribuer />
      <HomeFin />
    </>
  )
}
