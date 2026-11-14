import { createFileRoute } from '@tanstack/react-router'
import { plain } from '../components/atoms/Highlight'
import {
  HomeContribuer,
  HomeFin,
  HomePiliers,
} from '../components/organisms/home/HomeBlocks'
import { HomeFront } from '../components/organisms/home/HomeFront'
import { HOME } from '../data/home'
import { getPublication, listPublications } from '../services/public-api'
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
    return { publications, articles }
  },
  head: () => ({
    meta: seo({
      title: 'Accueil',
      description: `${plain(HOME.hero.title).replace('\n', ' ')}. ${HOME.hero.lead}`,
    }),
  }),
  component: Home,
})

/** La une : le principe, les articles publiés, les piliers, la contribution. */
function Home() {
  const { publications, articles } = Route.useLoaderData()
  return (
    <>
      <HomeFront articles={articles} />
      <HomePiliers publications={publications} />
      <HomeContribuer />
      <HomeFin />
    </>
  )
}
