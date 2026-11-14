import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../atoms/Button'
import { Field } from '../../atoms/Field'
import { Notice } from '../../atoms/Notice'
import { Select } from '../../atoms/Select'
import { PROVIDER_KIND_LABELS } from '../../../data/labels'
import type { NewProvider, ProviderKind } from '../../../types/catalogue'

const schema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  acronym: z.string().trim().min(1, 'Sigle requis'),
  kind: z.enum(
    Object.keys(PROVIDER_KIND_LABELS) as [ProviderKind, ...ProviderKind[]],
  ),
  officialUrl: z.url({ protocol: /^https$/, error: 'Une adresse en https://' }),
})

type Props = {
  onSubmit: (values: NewProvider) => void
  pending: boolean
  reasons: string[]
}

export function ProviderForm({ onSubmit, pending, reasons }: Props) {
  const { register, handleSubmit, formState } = useForm<NewProvider>({
    resolver: zodResolver(schema),
    defaultValues: { kind: 'statistical_service' },
  })
  const errors = formState.errors
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Field
        label="Sigle"
        placeholder="DREES"
        error={errors.acronym?.message}
        {...register('acronym')}
      />
      <Field
        label="Nom complet"
        placeholder="Direction de la recherche, des études, de l’évaluation et des statistiques"
        error={errors.name?.message}
        {...register('name')}
      />
      <Select
        label="Type"
        options={Object.entries(PROVIDER_KIND_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        {...register('kind')}
      />
      <Field
        label="Site officiel"
        placeholder="https://drees.solidarites-sante.gouv.fr"
        error={errors.officialUrl?.message}
        {...register('officialUrl')}
      />
      <Notice reasons={reasons} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Déclarer le producteur'}
      </Button>
    </form>
  )
}
