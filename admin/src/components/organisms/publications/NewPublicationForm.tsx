import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../atoms/Button'
import { Field } from '../../atoms/Field'
import { Notice } from '../../atoms/Notice'
import { Select } from '../../atoms/Select'
import { TextArea } from '../../atoms/TextArea'
import { PILLAR_LABELS } from '../../../data/labels'
import type { Pillar } from '../../../types/catalogue'
import type { NewPublication } from '../../../types/publications'

const schema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Minuscules, chiffres et tirets'),
  pillar: z.enum(Object.keys(PILLAR_LABELS) as [Pillar, ...Pillar[]]),
  title: z
    .string()
    .trim()
    .min(1, 'Titre requis')
    .refine(
      (t) => !t.endsWith('?'),
      'Un titre nomme, il ne pose pas de question',
    ),
  summary: z.string().trim().min(1, 'Chapô requis'),
})

type Props = {
  onSubmit: (values: NewPublication) => void
  pending: boolean
  reasons: string[]
}

/** Ouvrir une publication sur un enjeu : son adresse, son pilier, son titre et son chapô. */
export function NewPublicationForm({ onSubmit, pending, reasons }: Props) {
  const { register, handleSubmit, formState } = useForm<NewPublication>({
    resolver: zodResolver(schema),
    defaultValues: { pillar: 'health' },
  })
  const errors = formState.errors
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Adresse publique"
          hint="Elle ne se renomme pas : /enjeux/acces-aux-medecins-generalistes"
          placeholder="acces-aux-medecins-generalistes"
          error={errors.slug?.message}
          {...register('slug')}
        />
        <Select
          label="Pilier"
          options={Object.entries(PILLAR_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          {...register('pillar')}
        />
      </div>
      <Field
        label="Titre"
        hint="Il nomme l’enjeu, sans question ni accroche."
        placeholder="Accès aux médecins généralistes"
        error={errors.title?.message}
        {...register('title')}
      />
      <TextArea
        label="Chapô"
        hint="Le périmètre de l’enjeu et ses sources, sans appréciation."
        error={errors.summary?.message}
        {...register('summary')}
      />
      <Notice reasons={reasons} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Création…' : 'Ouvrir la publication'}
      </Button>
    </form>
  )
}
