import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { AdminLayout } from '../layouts/AdminLayout'
import {
  sessionQuery,
  useSession,
  useSignOut,
} from '../hooks/session/useSession'

/**
 * La garde de l'administration : sans session, on part se connecter, et on
 * revient ensuite là où l'on allait. L'API refuse de son côté ; cette garde
 * évite seulement d'afficher un écran vide.
 */
export const Route = createFileRoute('/_admin')({
  beforeLoad: async ({ context, location }) => {
    try {
      await context.queryClient.ensureQueryData(sessionQuery)
    } catch {
      throw redirect({ to: '/signin', search: { redirect: location.href } })
    }
  },
  component: AdminRoute,
})

function AdminRoute() {
  const { data: member } = useSession()
  const signOut = useSignOut()
  const navigate = useNavigate()
  if (!member) return null
  return (
    <AdminLayout
      member={member}
      onSignOut={() =>
        signOut.mutate(undefined, {
          onSettled: () => navigate({ to: '/signin' }),
        })
      }
    />
  )
}
