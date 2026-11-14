import { useState } from 'react'
import { Button } from '../../atoms/Button'
import { Notice } from '../../atoms/Notice'
import type { Indicator } from '../../../types/catalogue'

type Props = {
  candidates: Indicator[]
  onLink: (code: string) => void
  pending: boolean
  reasons: string[]
}

/**
 * Relier ce jeu à un indicateur qui existe déjà : l'arrêté d'une nouvelle ARS
 * alimente le zonage national, sans créer une couche de plus.
 */
export function LinkIndicatorForm({
  candidates,
  onLink,
  pending,
  reasons,
}: Props) {
  const [code, setCode] = useState('')
  if (candidates.length === 0) return null
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 space-y-1.5 text-sm font-medium text-slate-700">
          Indicateur existant que ce jeu alimente aussi
          <select
            className="field h-10"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          >
            <option value="">(choisir un indicateur)</option>
            {candidates.map((i) => (
              <option key={i.code} value={i.code}>
                {i.label} ({i.code})
              </option>
            ))}
          </select>
        </label>
        <Button disabled={!code || pending} onClick={() => onLink(code)}>
          Relier
        </Button>
      </div>
      <Notice reasons={reasons} />
    </div>
  )
}
