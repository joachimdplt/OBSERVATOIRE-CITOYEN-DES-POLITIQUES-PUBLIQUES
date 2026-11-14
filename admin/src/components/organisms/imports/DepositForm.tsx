import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../atoms/Button'
import { Field } from '../../atoms/Field'
import { Notice } from '../../atoms/Notice'
import type { Deposit } from '../../../types/imports'

const schema = z.object({
  files: z.custom<FileList>(
    (v) => v instanceof FileList && v.length === 1,
    'Choisissez un fichier',
  ),
  vintage: z.string().trim().min(1, 'Millésime requis'),
  fileUrl: z.url({
    protocol: /^https$/,
    error: 'L’adresse exacte du fichier, en https://',
  }),
  collectedAt: z.string().min(1, 'Date requise'),
  sheet: z.string().optional(),
})
type Values = z.infer<typeof schema>

type Props = {
  onSubmit: (deposit: Deposit) => void
  pending: boolean
  reasons: string[]
}

/** Déposer le fichier d'un producteur : il devient une nouvelle version, l'ancienne reste. */
export function DepositForm({ onSubmit, pending, reasons }: Props) {
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { collectedAt: new Date().toISOString().slice(0, 10) },
  })
  const errors = formState.errors
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(({ files, sheet, ...rest }) =>
        onSubmit({
          ...rest,
          file: files[0],
          sheet: sheet?.trim() || undefined,
        }),
      )}
    >
      <Field
        label="Fichier CSV ou Excel (.xlsx)"
        type="file"
        accept=".csv,.txt,.xlsx"
        className="py-1.5"
        error={errors.files?.message}
        {...register('files')}
      />
      <Field
        label="Adresse exacte du fichier chez le producteur"
        placeholder="https://"
        error={errors.fileUrl?.message}
        {...register('fileUrl')}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Millésime"
          placeholder="2024"
          error={errors.vintage?.message}
          {...register('vintage')}
        />
        <Field
          label="Téléchargé le"
          type="date"
          error={errors.collectedAt?.message}
          {...register('collectedAt')}
        />
        <Field
          label="Onglet (classeur)"
          hint="Le premier sinon."
          {...register('sheet')}
        />
      </div>
      <Notice reasons={reasons} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Lecture du fichier…' : 'Déposer'}
      </Button>
    </form>
  )
}
