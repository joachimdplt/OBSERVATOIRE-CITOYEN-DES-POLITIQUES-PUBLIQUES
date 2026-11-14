import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useIndicatorMap } from '../../../hooks/useIndicatorMap'
import { categoryClasses, quantileClasses } from '../../../domain/classes'
import type { Category } from '../../../types/public'
import { frenchNumber } from '../../../utils/number'
import { MapPin } from 'lucide-react'
import { PeriodSwitch } from '../../molecules/PeriodSwitch'
import { MapLegend } from './MapLegend'
import { CLASS_COLORS, categoryColors } from './palette'
import { REGION_BOUNDS } from '../../../data/regions'
import { categoryIn } from '../../../utils/category'

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
  /** Pour un indicateur qui se compare dans sa région : la région affichée. */
  region?: string
  onPeriod: (period: string) => void
  onSelect: (territory: {
    code: string
    name: string
    level: 'commune' | 'municipal_district'
  }) => void
  /** À gauche des années : le choix de la région, s'il y a lieu. */
  toolbar?: ReactNode
  /** Vrai tant qu'une région doit être choisie avant de dessiner la carte. */
  waiting?: boolean
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
  region,
  onPeriod,
  onSelect,
  toolbar,
  waiting = false,
  side,
}: Props) {
  const { values, failed } = useIndicatorMap(code, period, region, !waiting)
  const bounds = region ? REGION_BOUNDS[region] : undefined
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
  // La légende ne nomme que les catégories présentes sur la carte affichée :
  // la ZAR n'existe qu'en Bretagne et en Occitanie.
  const present = new Set(values?.map((v) => v[3]))
  const entries = categories
    ? categories
        .map((c, i) => ({ ...categoryIn(c, region), color: colors[i] }))
        .filter((c) => !values || present.has(c.code))
        .map((c) => ({
          color: c.color,
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
      <div className="flex flex-wrap items-center gap-3">
        {toolbar}
        <PeriodSwitch periods={periods} active={period} onPick={onPeriod} />
        <span className="text-xs text-slate-400">
          {waiting
            ? null
            : values
              ? `${frenchNumber(String(values.length))} territoires`
              : failed
                ? 'Données indisponibles'
                : 'Lecture des valeurs…'}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="surface overflow-hidden rounded-2xl">
          {waiting ? (
            <div className="flex h-[70vh] min-h-[420px] flex-col items-center justify-center gap-3 bg-gradient-to-b from-white to-slate-50 px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <MapPin size={20} />
              </span>
              <p className="text-base font-medium text-slate-900">
                Choisissez une région
              </p>
              <p className="max-w-sm text-sm text-slate-500">
                Chaque agence régionale de santé classe les communes de sa
                région : la carte se lit une région à la fois.
              </p>
            </div>
          ) : browser && classes ? (
            <Suspense
              fallback={<div className="h-[70vh] min-h-[420px] bg-slate-100" />}
            >
              <IndicatorMap
                classes={classes.byCode}
                colors={colors}
                bounds={bounds}
                onSelect={onSelect}
              />
            </Suspense>
          ) : (
            <div className="h-[70vh] min-h-[420px] animate-pulse bg-slate-100" />
          )}
        </div>
        {/* La légende en tête, toujours visible au défilement ; la fiche de la commune défile dessous. */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start">
          {entries.length > 0 && (
            <div className="surface shrink-0 p-5">
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
            </div>
          )}
          <div className="min-h-0 space-y-4 overflow-y-auto">
            {side}
            {!region && !waiting && (
              <p className="px-1 text-xs text-slate-400">
                Outre-mer : à venir sur la carte.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
