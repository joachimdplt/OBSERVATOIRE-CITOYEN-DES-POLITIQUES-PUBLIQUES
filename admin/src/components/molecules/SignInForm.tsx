import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../atoms/Button'
import { Field } from '../atoms/Field'
import { Notice } from '../atoms/Notice'

const schema = z.object({
  email: z.email('Adresse invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})
export type SignInValues = z.infer<typeof schema>

type Props = {
  onSubmit: (values: SignInValues) => void
  pending: boolean
  reasons: string[]
}

export function SignInForm({ onSubmit, pending, reasons }: Props) {
  const { register, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(schema),
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field
        label="Adresse électronique"
        type="email"
        autoComplete="username"
        error={formState.errors.email?.message}
        {...register('email')}
      />
      <Field
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        error={formState.errors.password?.message}
        {...register('password')}
      />
      <Notice reasons={reasons} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  )
}
