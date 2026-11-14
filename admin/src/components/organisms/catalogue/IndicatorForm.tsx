import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../atoms/Button'
import { Field } from '../../atoms/Field'
import { Notice } from '../../atoms/Notice'
import { Select } from '../../atoms/Select'
import { TextArea } from '../../atoms/TextArea'
import { PILLAR_LABELS } from '../../../data/labels'
import { parseCategories } from '../../../utils/categories'
import type {
  Aggregation,
  NewIndicator,
  Pillar,
} from '../../../types/catalogue'

const schema = z.object({
  datasetId: z.string(),
  code: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Minuscules sans accent, chiffres et tirets',
    )
    .min(3, 'Au moins 3 caractères'),
  label: z.string().trim().min(1, 'Libellé requis'),
  definition: z.string().trim().min(1, 'Définition requise'),
  scope: z.string().trim().min(1, 'Champ requis'),
  unit: z.string().trim().min(1, 'Unité requise'),
  pillar: z.enum(Object.keys(PILLAR_LABELS) as [Pillar, ...Pillar[]]),
  allowedAggregations: z.array(z.enum(['sum', 'mean'])),
  kind: z.enum(['number', 'category']),
  categoriesText: z.string(),
  method: z.string().trim().min(1, 'Méthode requise'),
  limits: z.string().trim().min(1, 'Les limites sont obligatoires'),
})

const AGGREGATIONS: { value: Aggregation; label: string }[] = [
  { value: 'sum', label: 'Somme (des effectifs, des lits…)' },
  { value: 'mean', label: 'Moyenne' },
]

type Props = {
  datasetId: string
  onSubmit: (values: NewIndicator) => void
  pending: boolean
  reasons: string[]
}

type Values = NewIndicator & {
  kind: 'number' | 'category'
  categoriesText: string
}

export function IndicatorForm({
  datasetId,
  onSubmit,
  pending,
  reasons,
}: Props) {
  const { register, handleSubmit, formState, watch } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      datasetId,
      pillar: 'health',
      allowedAggregations: [],
      kind: 'number',
      categoriesText: '',
    },
  })
  const kind = watch('kind')
  const submit = ({ categoriesText, ...values }: Values) =>
    onSubmit(
      values.kind === 'category'
        ? {
            ...values,
            allowedAggregations: [],
            categories: parseCategories(categoriesText),
          }
        : values,
    )
  const errors = formState.errors
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      <Field
        label="Libellé"
        error={errors.label?.message}
        {...register('label')}
      />
      <Field
        label="Code"
        hint="Il deviendra l’adresse publique de la fiche et ne se renommera jamais."
        placeholder="apl-medecins-generalistes"
        error={errors.code?.message}
        {...register('code')}
      />
      <TextArea
        label="Définition"
        error={errors.definition?.message}
        {...register('definition')}
      />
      <Field
        label="Champ"
        hint="Le périmètre couvert : « écoliers du premier degré », pas « tous les élèves »."
        error={errors.scope?.message}
        {...register('scope')}
      />
      <Field
        label="Unité"
        hint="Telle que le producteur l’écrit."
        error={errors.unit?.message}
        {...register('unit')}
      />
      <Select
        label="Pilier"
        options={Object.entries(PILLAR_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        {...register('pillar')}
      />
      <Select
        label="Nature"
        options={[
          { value: 'number', label: 'Un nombre (une valeur par territoire)' },
          {
            value: 'category',
            label: 'Une catégorie d’une liste fermée (un zonage)',
          },
        ]}
        {...register('kind')}
      />
      {kind === 'category' && (
        <TextArea
          label="Catégories, une par ligne"
          hint="Le code tel que le fichier l’écrit, puis le libellé du texte officiel : ZIP = Zone d’intervention prioritaire"
          rows={4}
          {...register('categoriesText')}
        />
      )}
      <fieldset className={`space-y-2 ${kind === 'category' ? 'hidden' : ''}`}>
        <legend className="text-sm font-medium text-slate-700">
          Agrégations permises
        </legend>
        <p className="text-xs text-slate-500">
          Aucune case cochée : aucune somme ni moyenne ne sera faite.
        </p>
        {AGGREGATIONS.map((a) => (
          <label key={a.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              value={a.value}
              {...register('allowedAggregations')}
            />{' '}
            {a.label}
          </label>
        ))}
      </fieldset>
      <TextArea
        label="Méthode"
        error={errors.method?.message}
        {...register('method')}
      />
      <TextArea
        label="Limites"
        hint="Les conclusions à ne pas en tirer. Par exemple : « pas un nombre de médecins manquants »."
        error={errors.limits?.message}
        {...register('limits')}
      />
      <Notice reasons={reasons} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Définir l’indicateur'}
      </Button>
    </form>
  )
}
