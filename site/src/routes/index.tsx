import { createFileRoute } from '@tanstack/react-router'
import { plain } from '../components/atoms/Highlight'
import { HomeContribuer } from '../components/organisms/home/HomeBlocks'
import { HomeSteps } from '../components/organisms/home/HomeSteps'
import { HomeHero } from '../components/organisms/home/HomeFront'
import { HomeProgrammes } from '../components/organisms/home/HomeProgrammes'
import { HOME } from '../data/home'
import { getElectionShuffled } from '../services/public-api'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/')({
  loader: async () => {
    // L'accueil reste lisible si l'élection n'est pas encore inscrite.
    const election = await getElectionShuffled({
      data: { slug: 'presidentielle-2027' },
    }).catch(() => null)
    return { election }
  },
  head: () => ({
    meta: seo({
      title: 'Accueil',
      description: `${plain(HOME.hero.title).replace('\n', ' ')}. ${HOME.hero.lead}`,
    }),
  }),
  component: Home,
})

/**
 * L'accueil : le principe et ses garanties, comment l'observatoire se
 * nourrit, les candidats, la contribution. Les articles et la carte sont
 * mis de côté pour l'instant (branche articles-carte).
 */
function Home() {
  const { election } = Route.useLoaderData()
  return (
    <>
      <HomeHero />
      <HomeSteps />
      {election && <HomeProgrammes election={election} />}
      <HomeContribuer />
    </>
  )
}
