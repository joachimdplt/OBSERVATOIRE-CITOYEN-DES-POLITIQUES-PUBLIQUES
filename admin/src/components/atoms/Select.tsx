import { forwardRef, useId } from 'react'
import type { SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: { value: string; label: string }[]
  error?: string
}

/** Un choix dans une liste fermée. */
export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, options, error, id, ...rest },
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
      <select ref={ref} id={inputId} {...rest} className="field h-10">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
})
