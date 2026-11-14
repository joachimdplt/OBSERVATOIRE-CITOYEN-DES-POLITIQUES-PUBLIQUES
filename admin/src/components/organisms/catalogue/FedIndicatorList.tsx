import { useState } from 'react'
import { Button } from '../../atoms/Button'
import { Notice } from '../../atoms/Notice'
import { TextArea } from '../../atoms/TextArea'
import type { Indicator } from '../../../types/catalogue'

type Props = {
  indicators: Indicator[]
  onRetire: (code: string, reason: string) => void
  pending: boolean
  reasons: string[]
}

/**
 * Les indicateurs que ce jeu alimente. Un lien se retire avec sa raison : il
 * ne s'efface pas, et la fiche publique de l'indicateur dit qui l'a retiré,
 * quand et pourquoi.
 */
export function FedIndicatorList({
  indicators,
  onRetire,
  pending,
  reasons,
}: Props) {
  const [retiring, setRetiring] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  if (indicators.length === 0)
    return (
      <p className="text-sm text-slate-500">Aucun indicateur pour l’instant.</p>
    )
  return (
    <ul className="space-y-3 text-sm">
      {indicators.map((i) => (
        <li key={i.code} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span>
              {i.label} <code className="text-xs text-slate-500">{i.code}</code>
            </span>
            {retiring !== i.code && (
              <Button
                variant="ghost"
                onClick={() => {
                  setRetiring(i.code)
                  setReason('')
                }}
              >
                Retirer
              </Button>
            )}
          </div>
          {retiring === i.code && (
            <div className="space-y-3 rounded-lg bg-slate-50 p-4">
              <TextArea
                label="Pourquoi retirer ce jeu de l’indicateur ?"
                hint="Lu par le public sur la fiche de l’indicateur. Les valeurs de ce jeu ne s’afficheront plus pour cet indicateur ; ses versions restent dans son historique."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Notice reasons={reasons} />
              <div className="flex gap-2">
                <Button
                  disabled={pending || reason.trim().length < 10}
                  onClick={() => onRetire(i.code, reason)}
                >
                  Retirer de l’indicateur
                </Button>
                <Button variant="ghost" onClick={() => setRetiring(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
