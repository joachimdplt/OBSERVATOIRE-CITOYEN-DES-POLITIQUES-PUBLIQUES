import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { buttonClass } from '../../atoms/Button'
import {
  FREQUENCY_LABELS,
  PILLAR_LABELS,
  PROVIDER_KIND_LABELS,
} from '../../../data/labels'
import type { Provider } from '../../../types/catalogue'

/**
 * Le catalogue, du producteur à l'indicateur. Chaque niveau dit qui l'a
 * déclaré, et propose d'ajouter le niveau du dessous.
 */
export function CatalogueTree({ providers }: { providers: Provider[] }) {
  return (
    <div className="space-y-4">
      {providers.map((p) => (
        <section key={p.id} className="surface overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold">
                {p.acronym}{' '}
                <span className="font-normal text-slate-500">· {p.name}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {PROVIDER_KIND_LABELS[p.kind]} · déclaré par {p.createdBy.name}
              </p>
            </div>
            <Link
              to="/datasets/new"
              search={{ provider: p.id }}
              className={buttonClass('secondary')}
            >
              <Plus size={15} /> Jeu de données
            </Link>
          </header>
          {p.datasets.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">
              Aucun jeu de données déclaré.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {p.datasets.map((d) => (
                <li key={d.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to="/datasets/$datasetId"
                        params={{ datasetId: d.id }}
                        className="text-sm font-medium hover:underline"
                      >
                        {d.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {d.license} · {FREQUENCY_LABELS[d.frequency]} ·{' '}
                        {d.producerRef}
                      </p>
                    </div>
                    <Link
                      to="/indicators/new"
                      search={{ dataset: d.id }}
                      className={buttonClass('ghost')}
                    >
                      <Plus size={15} /> Indicateur
                    </Link>
                  </div>
                  {d.indicators.length > 0 && (
                    <ul className="space-y-1.5 border-l border-slate-200 pl-4">
                      {d.indicators.map((i) => (
                        <li key={i.id} className="text-sm">
                          <span className="font-medium">{i.label}</span>
                          <span className="text-slate-500">
                            {' '}
                            · {PILLAR_LABELS[i.pillar]} · {i.unit}
                          </span>
                          <code className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                            {i.code}
                          </code>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
