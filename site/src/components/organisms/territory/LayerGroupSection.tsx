import { Link } from '@tanstack/react-router'
import type { TerritoryLayer } from '../../../types/public'
import { approximately, frenchNumber } from '../../../utils/number'
import { ValueCell } from '../indicators/ValueCell'

type Props = { layers: TerritoryLayer[] }

/**
 * Plusieurs couches d'un même jeu de données, lues ensemble : la
 * population par tranche d'âge, une ligne par tranche. Chaque nombre est
 * celui du producteur ; l'ordre de grandeur s'écrit à côté, la valeur exacte
 * reste visible. Aucune part n'est calculée.
 */
export function LayerGroupSection({ layers }: Props) {
  const [first] = layers
  const latest = (layer: TerritoryLayer) => layer.values.at(-1)
  const period = latest(first)?.period
  const department = first.scope.level === 'department'
  // Les unités ne s'écrivent à chaque ligne que si elles diffèrent : l'âge
  // moyen en ans, les effectifs en médecins.
  const units = new Set(layers.map((l) => l.indicator.unit))
  return (
    <section className="space-y-2 border-t border-slate-100 pt-4">
      <p className="text-xs font-medium text-slate-500">
        {first.dataset.title}
        {period ? ` (${period})` : ''}
      </p>
      {department && (
        <p className="text-xs text-slate-500">
          Chiffres du département : {first.scope.name}
        </p>
      )}
      <dl className="space-y-1 text-sm">
        {layers.map((layer) => {
          const v = latest(layer)
          const rounded = v?.value != null ? approximately(v.value) : null
          return (
            <div
              key={layer.indicator.code}
              className="flex items-baseline justify-between gap-3"
              title={v ? `Ligne ${v.sourceRow} du fichier du producteur` : ''}
            >
              <dt className="text-slate-600">{layer.indicator.label}</dt>
              <dd className="text-right tabular-nums">
                {v && v.value != null && rounded ? (
                  <>
                    {rounded !== frenchNumber(v.value) && (
                      <span className="mr-1 text-xs text-slate-400">
                        {frenchNumber(v.value)}
                      </span>
                    )}
                    {rounded !== frenchNumber(v.value)
                      ? `≈ ${rounded}`
                      : rounded}
                    {units.size > 1 && (
                      <span className="ml-1 text-xs text-slate-400">
                        {layer.indicator.unit}
                      </span>
                    )}
                  </>
                ) : v ? (
                  <ValueCell observation={v} categories={null} />
                ) : null}
              </dd>
            </div>
          )
        })}
      </dl>
      <p className="text-xs text-slate-400">
        {first.indicator.producer}
        {units.size === 1 ? ` · ${first.indicator.unit}` : ''}
        {first.values.some((v) => v.publication.status === 'preprint')
          ? ' · vérifiée par son auteur'
          : ''}{' '}
        ·{' '}
        <Link
          to="/indicators/$code"
          params={{ code: first.indicator.code }}
          className="underline"
        >
          comment lire ces chiffres
        </Link>
      </p>
    </section>
  )
}
