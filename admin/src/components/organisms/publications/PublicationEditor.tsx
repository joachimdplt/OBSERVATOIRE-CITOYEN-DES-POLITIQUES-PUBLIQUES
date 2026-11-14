import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../atoms/Button'
import { Field } from '../../atoms/Field'
import { Notice } from '../../atoms/Notice'
import { TextArea } from '../../atoms/TextArea'
import type { Indicator } from '../../../types/catalogue'
import type { PublicationContent } from '../../../types/publications'

type Props = {
  initial: PublicationContent
  indicators: Indicator[]
  onSave: (content: PublicationContent) => void
  pending: boolean
  reasons: string[]
}

type Section = PublicationContent['sections'][number]

/**
 * L'éditeur d'un brouillon : le titre, le chapô, puis les maillons. Chaque
 * maillon a un titre, un texte, et ses indicateurs, chacun avec la raison de
 * son choix. Le brouillon s'enregistre inachevé ; il ne se prépublie
 * qu'entier.
 */
export function PublicationEditor({
  initial,
  indicators,
  onSave,
  pending,
  reasons,
}: Props) {
  const [content, setContent] = useState(initial)
  const sections = content.sections
  const setSections = (next: Section[]) =>
    setContent({ ...content, sections: next })
  const updateSection = (i: number, patch: Partial<Section>) =>
    setSections(sections.map((s, k) => (k === i ? { ...s, ...patch } : s)))
  const move = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= sections.length) return
    const next = [...sections]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSections(next)
  }

  return (
    <div className="space-y-6">
      <Field
        label="Titre"
        hint="Il nomme l’enjeu, sans question ni accroche."
        value={content.title}
        onChange={(e) => setContent({ ...content, title: e.target.value })}
      />
      <TextArea
        label="Chapô"
        rows={3}
        value={content.summary}
        onChange={(e) => setContent({ ...content, summary: e.target.value })}
      />

      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-700">Maillons</p>
        {sections.map((section, i) => (
          <div
            key={i}
            className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500">
                Maillon {i + 1}
              </span>
              <span className="flex gap-1">
                <Button
                  variant="ghost"
                  onClick={() => move(i, -1)}
                  aria-label="Monter"
                >
                  <ArrowUp size={14} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => move(i, 1)}
                  aria-label="Descendre"
                >
                  <ArrowDown size={14} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Retirer le maillon"
                  onClick={() =>
                    setSections(sections.filter((_, k) => k !== i))
                  }
                >
                  <Trash2 size={14} />
                </Button>
              </span>
            </div>
            <Field
              label="Titre du maillon"
              placeholder="Âge des généralistes libéraux"
              value={section.title}
              onChange={(e) => updateSection(i, { title: e.target.value })}
            />
            <TextArea
              label="Texte"
              hint="Le périmètre du maillon, sans chiffre qui ne vienne d’un indicateur."
              rows={2}
              value={section.text}
              onChange={(e) => updateSection(i, { text: e.target.value })}
            />
            <div className="space-y-2">
              {section.indicators.map((x, k) => (
                <div
                  key={k}
                  className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                >
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    Indicateur
                    <select
                      className="field h-10"
                      value={x.code}
                      onChange={(e) =>
                        updateSection(i, {
                          indicators: section.indicators.map((y, m) =>
                            m === k ? { ...y, code: e.target.value } : y,
                          ),
                        })
                      }
                    >
                      <option value="">(choisir)</option>
                      {indicators.map((ind) => (
                        <option key={ind.code} value={ind.code}>
                          {ind.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Pourquoi cet indicateur ici"
                    value={x.justification}
                    onChange={(e) =>
                      updateSection(i, {
                        indicators: section.indicators.map((y, m) =>
                          m === k ? { ...y, justification: e.target.value } : y,
                        ),
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    aria-label="Retirer l’indicateur"
                    onClick={() =>
                      updateSection(i, {
                        indicators: section.indicators.filter(
                          (_, m) => m !== k,
                        ),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() =>
                  updateSection(i, {
                    indicators: [
                      ...section.indicators,
                      { code: '', justification: '' },
                    ],
                  })
                }
              >
                <Plus size={14} /> Ajouter un indicateur
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            setSections([...sections, { title: '', text: '', indicators: [] }])
          }
        >
          <Plus size={14} /> Ajouter un maillon
        </Button>
      </div>

      <Notice reasons={reasons} />
      <Button
        disabled={pending}
        onClick={() =>
          onSave({
            ...content,
            sections: content.sections.map((s) => ({
              ...s,
              indicators: s.indicators.filter((x) => x.code),
            })),
          })
        }
      >
        {pending ? 'Enregistrement…' : 'Enregistrer le brouillon'}
      </Button>
    </div>
  )
}
