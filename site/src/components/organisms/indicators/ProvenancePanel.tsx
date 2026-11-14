import { ExternalLink } from 'lucide-react'
import { Card } from '../../atoms/Card'
import { Term } from '../../atoms/Term'
import { PublicationBadge } from '../../molecules/PublicationBadge'
import type { Provenance } from '../../../types/public'

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : 'non documenté'

/** D'où viennent les chiffres : producteur, fichier, relecture, licences. Sous chaque fiche. */
export function ProvenancePanel({ provenance: p }: { provenance: Provenance }) {
  return (
    <Card title={`Provenance du millésime ${p.version.vintage}`}>
      <dl className="grid gap-5 sm:grid-cols-2">
        <Term label="Producteur">
          <a
            href={p.producer.url}
            className="underline decoration-slate-300 hover:decoration-slate-900"
          >
            {p.producer.acronym}
          </a>{' '}
          · {p.producer.name}
        </Term>
        <Term label="Jeu de données">
          <a
            href={p.dataset.url}
            className="underline decoration-slate-300 hover:decoration-slate-900"
          >
            {p.dataset.title}
          </a>
        </Term>
        <Term label="Millésime et fichier d’origine">
          {p.version.vintage} ·{' '}
          <a
            href={p.version.fileUrl}
            className="inline-flex items-center gap-1 underline decoration-slate-300"
          >
            fichier <ExternalLink size={12} />
          </a>
          , collecté le {day(p.version.collectedAt)}
          <span className="mt-1 block font-mono text-[11px] text-slate-400">
            SHA-256 {p.version.fileHash}
          </span>
        </Term>
        <Term label="Relecture">
          <PublicationBadge status={p.status} label={p.statusLabel} />
          <span className="mt-1 block text-slate-600">
            Auteur : {p.version.authoredBy ?? 'non documenté'}
            {p.version.reviewedBy ? ` · relu par ${p.version.reviewedBy}` : ''}
          </span>
        </Term>
        <Term label="Méthodologie du producteur">{p.dataset.methodology}</Term>
        <Term label="Licences">
          Données : {p.licenses.data.name} ({p.licenses.data.holder}) · Fiche :{' '}
          <a
            href={p.licenses.content.url}
            className="underline decoration-slate-300"
          >
            {p.licenses.content.name}
          </a>
        </Term>
      </dl>
    </Card>
  )
}
