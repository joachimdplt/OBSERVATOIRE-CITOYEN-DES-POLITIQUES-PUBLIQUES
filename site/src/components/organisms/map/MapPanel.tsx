import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useIndicatorMap } from '../../../hooks/useIndicatorMap'
import { categoryClasses, quantileClasses } from '../../../domain/classes'
import type { Category } from '../../../types/public'
import { frenchNumber } from '../../../utils/number'
import { MapLegend } from './MapLegend'
import { CLASS_COLORS, categoryColors } from './palette'

// La carte ne se dessine que dans le navigateur.
const IndicatorMap = lazy(() =>
  import('./IndicatorMap').then((m) => ({ default: m.IndicatorMap })),
)

type Props = {
  code: string
  unit: string
  categories: Category[] | null
  /** Pour un nombre : les deux bouts de l'échelle, en mots. */
  scale: { low: string; high: string } | null
  periods: string[]
  period: string
  onPeriod: (period: string) => void
  onSelect: (territory: {
    code: string
    name: string
    level: 'commune' | 'municipal_district'
  }) => void
  /** Ce qui s'affiche à côté de la carte : la fiche de la commune choisie, ou une consigne. */
  side: ReactNode
}

/** La carte de France, une couche à la fois : l'année choisie, la légende, et à côté ce qu'on lui confie. */
export function MapPanel({
  code,
  unit,
  categories,
  scale,
  periods,
  period,
  onPeriod,
  onSelect,
  side,
}: Props) {
  const { values, failed } = useIndicatorMap(code, period)
  const classes = useMemo(
    () =>
      values
        ? categories
          ? categoryClasses(
              values,
              categories.map((c) => c.code),
            )
          : quantileClasses(values)
        : null,
    [values, categories],
  )
  const colors = useMemo(
    () => (categories ? categoryColors(categories.length) : [...CLASS_COLORS]),
    [categories],
  )
  const entries = categories
    ? categories.map((c, i) => ({
        color: colors[i],
        label: c.label,
        detail: c.explanation,
      }))
    : (classes?.lower ?? []).map((value, k) => ({
        color: colors[k],
        label:
          k === 0 ? `${frenchNumber(value)}` : `dès ${frenchNumber(value)}`,
      }))
  const [browser, setBrowser] = useState(false)
  useEffect(() => setBrowser(true), [])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPeriod(p)}
            className={`h-8 rounded-full px-3 text-sm ${
              p === period
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ))}
        <span className="text-xs text-slate-500">
          {values
            ? `${values.length} territoires`
            : failed
              ? 'Données indisponibles'
              : 'Lecture des valeurs…'}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="surface overflow-hidden">
          {browser && classes ? (
            <Suspense
              fallback={<div className="h-[70vh] min-h-[420px] bg-slate-100" />}
            >
              <IndicatorMap
                classes={classes.byCode}
                colors={colors}
                onSelect={onSelect}
              />
            </Suspense>
          ) : (
            <div className="h-[70vh] min-h-[420px] animate-pulse bg-slate-100" />
          )}
        </div>
        <div className="space-y-4">
          {side}
          {entries.length > 0 && (
            <MapLegend
              title={unit}
              entries={entries}
              scale={categories ? null : scale}
              note={
                categories
                  ? 'Les libellés sont ceux du texte officiel.'
                  : 'Cinq groupes de communes de même taille. Les chiffres sont des valeurs publiées, non arrondies.'
              }
            />
          )}
          <p className="text-xs text-slate-400">
            Outre-mer : à venir sur la carte.
          </p>
        </div>
      </div>
    </section>
  )
}
