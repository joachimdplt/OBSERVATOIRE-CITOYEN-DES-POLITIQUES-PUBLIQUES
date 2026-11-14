import { useForm } from 'react-hook-form'
import { Button } from '../../atoms/Button'
import { Field } from '../../atoms/Field'
import { Notice } from '../../atoms/Notice'
import { Select } from '../../atoms/Select'
import { TERRITORY_LEVELS } from '../../../data/labels'
import type { Indicator } from '../../../types/catalogue'
import type { ImportDescription, TerritoryLevel } from '../../../types/imports'

type Values = {
  firstRow: string
  lastRow: string
  territoryColumn: string
  level: TerritoryLevel
  vintage: string
  periodMode: 'column' | 'value'
  periodColumn: string
  periodValue: string
  decimalSeparator: ',' | '.'
  columnsByIndicator: Record<string, string>
}

type Props = {
  columns: string[]
  headerRow: number
  indicators: Indicator[]
  current: ImportDescription | null
  format: 'csv' | 'xlsx'
  onSubmit: (description: ImportDescription) => void
  pending: boolean
  reasons: string[]
}

/**
 * Dire où lire le territoire, la période, et quelle colonne porte chaque
 * indicateur du jeu. Le séparateur décimal se déclare : « 3.300 » vaut 3,3 ou
 * 3 300, et rien ne le devine.
 */
export function DescriptionForm({
  columns,
  headerRow,
  indicators,
  current,
  format,
  onSubmit,
  pending,
  reasons,
}: Props) {
  const columnOptions = [
    { value: '', label: '(choisir une colonne)' },
    ...columns.filter(Boolean).map((c) => ({ value: c, label: c })),
  ]
  const { register, handleSubmit, watch } = useForm<Values>({
    defaultValues: {
      firstRow: current?.firstRow ? String(current.firstRow) : '',
      lastRow: current?.lastRow ? String(current.lastRow) : '',
      territoryColumn: current?.territory.column ?? '',
      level: current?.territory.level ?? 'commune',
      vintage: String(current?.territory.vintage ?? 2026),
      periodMode: current?.period.column ? 'column' : 'value',
      periodColumn: current?.period.column ?? '',
      periodValue: current?.period.value ?? '',
      decimalSeparator:
        current?.decimalSeparator ?? (format === 'xlsx' ? '.' : ','),
      columnsByIndicator: Object.fromEntries(
        indicators.map((i) => [
          i.code,
          current?.values.find((v) => v.indicatorCode === i.code)?.column ?? '',
        ]),
      ),
    },
  })
  const periodMode = watch('periodMode')

  const submit = (v: Values) =>
    onSubmit({
      headerRow,
      ...(v.firstRow ? { firstRow: Number(v.firstRow) } : {}),
      ...(v.lastRow ? { lastRow: Number(v.lastRow) } : {}),
      territory: {
        column: v.territoryColumn,
        level: v.level,
        vintage: Number(v.vintage),
      },
      period:
        v.periodMode === 'column'
          ? { column: v.periodColumn }
          : { value: v.periodValue.trim() },
      decimalSeparator: v.decimalSeparator,
      values: Object.entries(v.columnsByIndicator)
        .filter(([, column]) => column)
        .map(([indicatorCode, column]) => ({ indicatorCode, column })),
    })

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-3">
        <Select
          label="Colonne du territoire"
          options={columnOptions}
          {...register('territoryColumn')}
        />
        <Select
          label="Niveau"
          options={Object.entries(TERRITORY_LEVELS).map(([value, label]) => ({
            value,
            label,
          }))}
          {...register('level')}
        />
        <Field
          label="Découpage officiel (COG)"
          type="number"
          {...register('vintage')}
        />
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">Période</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" value="value" {...register('periodMode')} /> La
            même pour tout le fichier
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="column" {...register('periodMode')} />{' '}
            Lue dans une colonne
          </label>
        </div>
        {periodMode === 'column' ? (
          <Select
            label="Colonne de la période"
            options={columnOptions}
            {...register('periodColumn')}
          />
        ) : (
          <Field
            label="Période"
            hint="2024, 2024-T3, 2024-03 ou 2025-2026"
            {...register('periodValue')}
          />
        )}
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">
          Colonnes de valeurs
        </legend>
        {indicators.length === 0 && (
          <p className="text-sm text-slate-500">
            Ce jeu n’a pas encore d’indicateur : définissez-en un dans le
            catalogue.
          </p>
        )}
        {indicators.map((i) => (
          <Select
            key={i.code}
            label={`${i.label} (${i.unit})`}
            options={[
              { value: '', label: '(absent de ce fichier)' },
              ...columnOptions.slice(1),
            ]}
            {...register(`columnsByIndicator.${i.code}`)}
          />
        ))}
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-3">
        <Select
          label="Séparateur décimal"
          options={[
            { value: ',', label: 'Virgule : 3,3' },
            { value: '.', label: 'Point : 3.3 (tableur, fichier anglais)' },
          ]}
          {...register('decimalSeparator')}
        />
        <Field
          label="Première ligne de données"
          hint="Vide : celle qui suit les en-têtes. La DREES met une ligne d’unités entre les deux."
          type="number"
          {...register('firstRow')}
        />
        <Field
          label="Dernière ligne à lire"
          hint="Vide : jusqu’au bout du fichier."
          type="number"
          {...register('lastRow')}
        />
      </div>
      <Notice reasons={reasons} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer la description'}
      </Button>
    </form>
  )
}
