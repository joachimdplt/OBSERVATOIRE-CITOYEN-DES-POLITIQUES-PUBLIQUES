import { useState } from 'react'
import { Button } from '../../atoms/Button'
import { Notice } from '../../atoms/Notice'
import { TextArea } from '../../atoms/TextArea'
import type { Category } from '../../../types/catalogue'
import { formatCategories, parseCategories } from '../../../utils/categories'

type Props = {
  categories: Category[]
  onSubmit: (categories: Category[]) => void
  onCancel: () => void
  pending: boolean
  reasons: string[]
}

/**
 * Compléter la liste fermée d'un indicateur : une catégorie de plus, les
 * codes d'un autre fichier, le libellé propre à une région. Les catégories
 * déjà déclarées gardent leur code et leur libellé officiel.
 */
export function CategoryAmendForm({
  categories,
  onSubmit,
  onCancel,
  pending,
  reasons,
}: Props) {
  const [text, setText] = useState(() => formatCategories(categories))
  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-4">
      <TextArea
        label="Catégories, une par ligne"
        hint="« ZIP, 1_ZIP = libellé » : le code de l’indicateur, puis les autres écritures du même sens. « ZAR @76 = libellé » : le libellé propre à la région 76. Une catégorie déjà déclarée ne se retire ni ne se renomme."
        rows={Math.max(4, text.split('\n').length + 1)}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Notice reasons={reasons} />
      <div className="flex gap-2">
        <Button
          disabled={pending}
          onClick={() => onSubmit(parseCategories(text, categories))}
        >
          Enregistrer la liste
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
