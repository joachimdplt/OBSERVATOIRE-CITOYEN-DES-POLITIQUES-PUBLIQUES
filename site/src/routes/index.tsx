import { createFileRoute } from '@tanstack/react-router'
import { plain } from '../components/atoms/Highlight'
import {
  HomeContribuer,
  HomeFin,
  HomePiliers,
} from '../components/organisms/home/HomeBlocks'
import { HomeFront } from '../components/organisms/home/HomeFront'
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
 * La une : le principe, les articles publiés, l'état des programmes de la
 * présidentielle, les piliers, la contribution.
 */
function Home() {
  const { publications, articles, election } = Route.useLoaderData()
  return (
    <>
      <HomeFront articles={articles} />
      {election && <HomeProgrammes election={election} />}
      <HomePiliers publications={publications} />
      <HomeContribuer />
      <HomeFin />
    </>
  )
}
