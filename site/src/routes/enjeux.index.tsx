import { createFileRoute, redirect } from '@tanstack/react-router'

/** L'ancienne adresse de la page des sujets : elle y mène. */
export const Route = createFileRoute('/enjeux/')({
  beforeLoad: () => {
    throw redirect({ to: '/sujets', statusCode: 301 })
  },
})
