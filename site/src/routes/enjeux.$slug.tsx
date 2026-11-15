import { createFileRoute, redirect } from '@tanstack/react-router'

/** L'ancienne adresse d'un sujet ou d'un article : elle mène à la nouvelle. */
export const Route = createFileRoute('/enjeux/$slug')({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: '/sujets/$slug',
      params: { slug: params.slug },
      search: location.search,
      statusCode: 301,
    })
  },
})
