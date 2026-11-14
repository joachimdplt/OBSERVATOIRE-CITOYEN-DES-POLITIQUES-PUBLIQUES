import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
}

/** Une case à remplir, avec son libellé, une aide, et l'erreur s'il y en a une. */
export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { label, hint, error, id, className = '', ...rest },
  ref,
) {
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
      <input
        ref={ref}
        id={inputId}
        {...rest}
        className={`field h-10 ${className}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
})
