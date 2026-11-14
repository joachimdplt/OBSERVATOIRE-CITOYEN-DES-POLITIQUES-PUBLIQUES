import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import type { TerritoryValues } from '../../../types/public'
import { ValueCell } from '../indicators/ValueCell'

type Props = { data: TerritoryValues | null; name: string; onClose: () => void }

/**
 * La fiche d'une commune : toutes les couches publiées, chacune avec ses
 * valeurs par année côte à côte. Aucun écart n'est calculé ; le lecteur
 * compare.
 */
export function TerritoryLayersCard({ data, name, onClose }: Props) {
  return (
    <div className="surface space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">
            {data?.territory.name ?? name}
          </p>
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
        data.layers.map(({ indicator, values }) => (
          <section
            key={indicator.code}
            className="space-y-2 border-t border-slate-100 pt-4"
          >
            <Link
              to="/indicators/$code"
              params={{ code: indicator.code }}
              className="block text-sm font-medium hover:underline"
            >
              {indicator.label}
            </Link>
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
            <p className="text-xs text-slate-500">
              {indicator.unit} · {indicator.producer} · ligne
              {values.length > 1 ? 's' : ''} du fichier :{' '}
              {values.map((v) => v.sourceRow).join(', ')}
              {values.some((v) => v.publication.status === 'preprint')
                ? ' · prépublication'
                : ''}
            </p>
          </section>
        ))
      )}
    </div>
  )
}
