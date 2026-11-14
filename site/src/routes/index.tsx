import { createFileRoute } from '@tanstack/react-router'
import { plain } from '../components/atoms/Highlight'
import {
  HomeConstat,
  HomeContribuer,
  HomeFin,
  HomeHero,
  HomeRegles,
  HomeReponse,
} from '../components/organisms/home/HomeBlocks'
import { HOME } from '../data/home'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: seo({
      title: 'Accueil',
      description: `${plain(HOME.hero.title)} ${HOME.hero.lead}`,
    }),
  }),
  component: Home,
})

/** L'accueil, un écran par idée : la question, le constat, la réponse, les règles, la contribution, l'action. */
function Home() {
  return (
    <>
      <HomeHero />
      <HomeConstat />
      <HomeReponse />
      <HomeRegles />
      <HomeContribuer />
      <HomeFin />
    </>
  )
}
