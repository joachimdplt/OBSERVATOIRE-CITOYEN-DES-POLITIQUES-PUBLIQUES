import { Link } from '@tanstack/react-router'
import type { TerritoryLayer } from '../../../types/public'
import { approximately, frenchNumber } from '../../../utils/number'
import { ValueCell } from '../indicators/ValueCell'

type Props = { layers: TerritoryLayer[] }

/**
 * Plusieurs couches qui répondent à la même question, lues ensemble : la
 * population par tranche d'âge, une ligne par tranche. Chaque nombre est
 * celui du producteur ; l'ordre de grandeur s'écrit à côté, la valeur exacte
 * reste visible. Aucune part n'est calculée.
 */
export function LayerGroupSection({ layers }: Props) {
  const [first] = layers
  const latest = (layer: TerritoryLayer) => layer.values.at(-1)
  const period = latest(first)?.period
  return (
    <section className="space-y-2 border-t border-slate-100 pt-4">
      <p className="text-xs font-medium text-slate-500">
        {first.indicator.question}
        {period ? ` (${period})` : ''}
      </p>
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
        {first.indicator.producer} · {first.indicator.unit}
        {first.values.some((v) => v.publication.status === 'preprint')
          ? ' · prépublication'
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
