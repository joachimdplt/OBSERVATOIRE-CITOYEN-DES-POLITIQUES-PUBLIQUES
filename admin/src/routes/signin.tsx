import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { SignInForm } from '../components/molecules/SignInForm'
import { useSignIn } from '../hooks/session/useSession'
import { reasonsOf } from '../utils/api-error'

export const Route = createFileRoute('/signin')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: SignInPage,
})

function SignInPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const signIn = useSignIn()

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Observatoire</h1>
          <p className="text-sm text-slate-500">
            Administration, pour l’équipe
          </p>
        </div>
        <div className="surface p-6">
          <SignInForm
            pending={signIn.isPending}
            reasons={signIn.error ? reasonsOf(signIn.error) : []}
            onSubmit={(values) =>
              signIn.mutate(values, {
                onSuccess: () => navigate({ to: redirect ?? '/' }),
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
