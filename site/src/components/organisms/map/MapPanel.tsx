import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useIndicatorMap } from '../../../hooks/useIndicatorMap'
import { categoryClasses, quantileClasses } from '../../../domain/classes'
import type { Category, Observation } from '../../../types/public'
import { frenchNumber } from '../../../utils/number'
import { TerritoryCard } from '../indicators/TerritoryCard'
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
  periods: string[]
  period: string
  selected: {
    code: string
    name: string
    observations: Observation[] | null
  } | null
  onPeriod: (period: string) => void
  onSelect: (territory: { code: string; name: string }) => void
  onClose: () => void
}

/** La carte de France d'un indicateur, l'année choisie, la légende, et le territoire cliqué. */
export function MapPanel({
  code,
  unit,
  categories,
  periods,
  period,
  selected,
  onPeriod,
  onSelect,
  onClose,
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
    ? categories.map((c, i) => ({ color: colors[i], label: c.label }))
    : (classes?.lower ?? []).map((value, k, lower) => ({
        color: colors[k],
        label:
          k === 0
            ? `moins de ${frenchNumber(lower[1] ?? value)}`
            : `à partir de ${frenchNumber(value)}`,
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
          {selected ? (
            <TerritoryCard
              categories={categories}
              name={selected.name}
              code={selected.code}
              observations={selected.observations}
              unit={unit}
              onClose={onClose}
            />
          ) : (
            <p className="surface p-5 text-sm text-slate-600">
              Cliquez sur une commune pour lire ses valeurs.
            </p>
          )}
          {entries.length > 0 && (
            <MapLegend
              title={unit}
              entries={entries}
              note={
                categories
                  ? 'Les libellés sont ceux du texte officiel.'
                  : 'Cinq classes de même effectif. Les bornes sont des valeurs publiées, non arrondies.'
              }
            />
          )}
          <p className="text-xs text-slate-400">
            Outre-mer : à venir sur la carte. Ses communes ont déjà leurs
            valeurs, par le détail.
          </p>
        </div>
      </div>
    </section>
  )
}
