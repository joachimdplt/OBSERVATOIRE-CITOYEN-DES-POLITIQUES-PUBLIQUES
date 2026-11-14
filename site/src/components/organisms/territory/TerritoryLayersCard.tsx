import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import type { TerritoryLayer, TerritoryValues } from '../../../types/public'
import { frenchDate } from '../../../utils/date'
import { approximately, frenchNumber } from '../../../utils/number'
import { readingOf } from '../../../utils/reading'
import { ValueCell } from '../indicators/ValueCell'
import { LayerGroupSection } from './LayerGroupSection'

type Props = { data: TerritoryValues | null; name: string; onClose: () => void }

/** La phrase de lecture de la valeur la plus récente, si elle est documentée. */
function sentenceOf({ indicator, values }: TerritoryLayer, territory: string) {
  const latest = values.at(-1)
  if (!latest || latest.status !== 'documented') return null
  const value =
    latest.category !== null
      ? (indicator.categories?.find((c) => c.code === latest.category)?.label ??
        latest.category)
      : latest.value !== null
        ? `environ ${approximately(latest.value)}`
        : null
  return value ? readingOf(indicator.readingTemplate, territory, value) : null
}

/**
 * Les couches rangées par question : celles qui posent la même (la population
 * de chaque tranche d'âge) se lisent ensemble, dans l'ordre de leur code.
 */
function groupsOf(layers: TerritoryLayer[]): TerritoryLayer[][] {
  const groups = new Map<string, TerritoryLayer[]>()
  for (const layer of layers) {
    const key = layer.indicator.question ?? layer.indicator.code
    groups.set(key, [...(groups.get(key) ?? []), layer])
  }
  // Les couches de la carte d'abord, puis le contexte qui aide à les lire.
  return [...groups.values()]
    .map((g) =>
      g.sort((a, b) => a.indicator.code.localeCompare(b.indicator.code)),
    )
    .sort(
      (a, b) =>
        Number(b[0].indicator.mapLayer) - Number(a[0].indicator.mapLayer),
    )
}

/**
 * La fiche d'une commune : pour chaque couche, la phrase de lecture du
 * producteur, puis les valeurs par année côte à côte. Aucun écart n'est
 * calculé ; le lecteur compare.
 */
export function TerritoryLayersCard({ data, name, onClose }: Props) {
  const territory = data?.territory.name ?? name
  return (
    <div className="surface space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{territory}</p>
          {data && (
            <p className="font-mono text-xs text-slate-400">
              {data.territory.code}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-slate-400 hover:text-slate-900"
        >
          <X size={16} />
        </button>
      </div>
      {!data ? (
        <p className="text-sm text-slate-500">Lecture…</p>
      ) : data.layers.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucune valeur publiée pour ce territoire.
        </p>
      ) : (
        groupsOf(data.layers).map((group) => {
          if (group.length > 1)
            return (
              <LayerGroupSection key={group[0].indicator.code} layers={group} />
            )
          const [layer] = group
          const { indicator, values } = layer
          const sentence = sentenceOf(layer, territory)
          const latest = values.at(-1)
          const explanation = indicator.categories?.find(
            (c) => c.code === latest?.category,
          )?.explanation
          return (
            <section
              key={indicator.code}
              className="space-y-2 border-t border-slate-100 pt-4"
            >
              <p className="text-xs font-medium text-slate-500">
                {indicator.question ?? indicator.label}
              </p>
              {sentence && (
                <p className="text-sm leading-relaxed text-slate-900">
                  {sentence}
                  {latest?.value != null && (
                    <span className="text-slate-500">
                      {' '}
                      (valeur exacte : {frenchNumber(latest.value)},{' '}
                      {latest.period})
                    </span>
                  )}
                </p>
              )}
              {latest?.referenceDate && (
                <p className="text-xs text-slate-500">
                  Date du texte : {frenchDate(latest.referenceDate)}
                </p>
              )}
              {explanation && (
                <p className="text-xs text-slate-500">{explanation}</p>
              )}
              {values.length > 1 && (
                <dl className="flex flex-wrap gap-x-5 gap-y-2">
                  {values.map((v) => (
                    <div
                      key={v.period}
                      title={`Ligne ${v.sourceRow} du fichier du producteur`}
                    >
                      <dt className="text-xs text-slate-500">{v.period}</dt>
                      <dd className="text-base">
                        <ValueCell
                          observation={v}
                          categories={indicator.categories}
                        />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {!sentence && values.length === 1 && latest && (
                <p className="text-base">
                  <ValueCell
                    observation={latest}
                    categories={indicator.categories}
                  />
                </p>
              )}
              <p className="text-xs text-slate-400">
                {indicator.producer} · ligne{values.length > 1 ? 's' : ''} du
                fichier : {values.map((v) => v.sourceRow).join(', ')}
                {values.some((v) => v.publication.status === 'preprint')
                  ? ' · prépublication'
                  : ''}{' '}
                ·{' '}
                <Link
                  to="/indicators/$code"
                  params={{ code: indicator.code }}
                  className="underline"
                >
                  comment lire ce chiffre
                </Link>
              </p>
            </section>
          )
        })
      )}
    </div>
  )
}
