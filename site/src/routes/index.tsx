import { createFileRoute } from '@tanstack/react-router'
import { plain } from '../components/atoms/Highlight'
import {
  HomeComment,
  HomeContribuer,
  HomeFin,
} from '../components/organisms/home/HomeBlocks'
import { HomeFront, HomeHero } from '../components/organisms/home/HomeFront'
import { HomeProgrammes } from '../components/organisms/home/HomeProgrammes'
import { HOME } from '../data/home'
import {
  getElectionShuffled,
  getPublication,
  listPublications,
} from '../services/public-api'
import type { PublicationSheet } from '../types/public'
import { seo } from '../utils/seo'

export const Route = createFileRoute('/')({
  loader: async () => {
    const publications = (await listPublications()) ?? []
    const articles = (
      await Promise.all(
        publications.map((p) => getPublication({ data: { slug: p.slug } })),
      )
    )
      .filter((a): a is PublicationSheet => a !== null)
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    // L'accueil reste lisible si l'élection n'est pas encore inscrite.
    const election = await getElectionShuffled({
      data: { slug: 'presidentielle-2027' },
    }).catch(() => null)
    return { publications, articles, election }
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
 * L'accueil : le principe et ses garanties, les candidats, les articles,
 * comment l'observatoire se nourrit, la contribution.
 */
function Home() {
  const { articles, election } = Route.useLoaderData()
  return (
    <>
      <HomeHero />
      {election && <HomeProgrammes election={election} />}
      <HomeFront articles={articles} />
      <HomeComment />
      <HomeContribuer />
      <HomeFin />
    </>
  )
}
