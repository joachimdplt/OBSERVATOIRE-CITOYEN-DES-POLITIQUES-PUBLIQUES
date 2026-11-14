import { forwardRef, useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  hint?: string
  error?: string
}

/** Une zone de texte, pour ce qui se dit en plus d'une ligne. */
export const TextArea = forwardRef<HTMLTextAreaElement, Props>(
  function TextArea({ label, hint, error, id, rows = 3, ...rest }, ref) {
    const generated = useId()
    const inputId = id ?? generated
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          {...rest}
          className="field resize-y"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  },
)
