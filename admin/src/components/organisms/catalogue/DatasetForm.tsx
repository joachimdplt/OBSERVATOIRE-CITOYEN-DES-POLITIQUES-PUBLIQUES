import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../atoms/Button'
import { Field } from '../../atoms/Field'
import { Notice } from '../../atoms/Notice'
import { Select } from '../../atoms/Select'
import { TextArea } from '../../atoms/TextArea'
import { FREQUENCY_LABELS } from '../../../data/labels'
import type { Frequency, NewDataset } from '../../../types/catalogue'

const schema = z.object({
  providerId: z.string(),
  producerRef: z.string().trim().min(1, 'Identifiant requis'),
  title: z.string().trim().min(1, 'Titre requis'),
  url: z.url({ protocol: /^https$/, error: 'Une adresse en https://' }),
  license: z.string().trim().min(1, 'Licence requise'),
  methodology: z.string().trim().min(1, 'Méthodologie requise'),
  frequency: z.enum(
    Object.keys(FREQUENCY_LABELS) as [Frequency, ...Frequency[]],
  ),
})

type Props = {
  providerId: string
  onSubmit: (values: NewDataset) => void
  pending: boolean
  reasons: string[]
}

/** Licence et méthodologie sont obligatoires : les deux premières questions du protocole de collecte. */
export function DatasetForm({ providerId, onSubmit, pending, reasons }: Props) {
  const { register, handleSubmit, formState } = useForm<NewDataset>({
    resolver: zodResolver(schema),
    defaultValues: {
      providerId,
      frequency: 'annual',
      license: 'Licence Ouverte v2.0 (Etalab)',
    },
  })
  const errors = formState.errors
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Field
        label="Titre"
        error={errors.title?.message}
        {...register('title')}
      />
      <Field
        label="Identifiant chez le producteur"
        hint="Tel que le producteur l’écrit, par exemple dans l’adresse du jeu."
        error={errors.producerRef?.message}
        {...register('producerRef')}
      />
      <Field
        label="Adresse du jeu"
        placeholder="https://"
        error={errors.url?.message}
        {...register('url')}
      />
      <Field
        label="Licence de réutilisation"
        error={errors.license?.message}
        {...register('license')}
      />
      <TextArea
        label="Méthodologie"
        error={errors.methodology?.message}
        {...register('methodology')}
      />
      <Select
        label="Fréquence de publication"
        options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        {...register('frequency')}
      />
      <Notice reasons={reasons} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Déclarer le jeu'}
      </Button>
    </form>
  )
}
