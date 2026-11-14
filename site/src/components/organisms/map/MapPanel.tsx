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
import { FRANCE, REGION_BOUNDS } from '../../../data/regions'
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
  /**
   * La région affichée, ou `france`. Un indicateur régional (le zonage) se
   * classe dans sa région ; un indicateur national (l'APL) garde les seuils
   * de la France entière, la région n'est qu'un cadrage.
   */
  region?: string
  regional?: boolean
  /** Le code de la commune choisie : la carte s'y cadre et l'entoure. */
  focus?: string
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
  regional = false,
  focus,
  onPeriod,
  onSelect,
  toolbar,
  waiting = false,
  side,
}: Props) {
  const { values, failed } = useIndicatorMap(
    code,
    period,
    regional ? region : undefined,
    !waiting,
  )
  const bounds = region ? REGION_BOUNDS[region] : undefined
  // Les territoires dessinés : ceux de la région choisie, ou tous.
  const shown = useMemo(
    () =>
      values && region && region !== FRANCE && !regional
        ? values.filter((v) => v[4] === region)
        : values,
    [values, region, regional],
  )
  // Les classes se calculent sur toutes les valeurs lues : pour l'APL, les
  // seuils de la France entière, la même couleur voulant dire la même chose
  // dans chaque région.
  const classes = useMemo(() => {
    if (!values || !shown) return null
    const all = categories
      ? categoryClasses(
          values,
          categories.map((c) => c.code),
        )
      : quantileClasses(values)
    const drawn = new Set(shown.map((v) => v[0]))
    return {
      ...all,
      byCode: new Map(
        [...all.byCode].filter(([territory]) => drawn.has(territory)),
      ),
    }
  }, [values, shown, categories])
  const colors = useMemo(
    () => (categories ? categoryColors(categories.length) : [...CLASS_COLORS]),
    [categories],
  )
  // La légende ne nomme que les catégories présentes sur la carte affichée :
  // la ZAR n'existe qu'en Bretagne et en Occitanie.
  const present = new Set(shown?.map((v) => v[3]))
  const entries = categories
    ? categories
        .map((c, i) => ({ ...categoryIn(c, region), color: colors[i] }))
        .filter((c) => !shown || present.has(c.code))
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
            : shown
              ? `${frenchNumber(String(shown.length))} territoires`
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
                {regional
                  ? 'Chaque région classe ses propres communes : la carte se lit une région à la fois.'
                  : 'Les couleurs gardent les mêmes seuils dans toutes les régions : une teinte veut dire la même chose partout.'}
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
                focus={focus}
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
            {region === FRANCE && (
              <p className="px-1 text-xs text-slate-400">
                Outre-mer : choisissez sa région dans la liste.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
