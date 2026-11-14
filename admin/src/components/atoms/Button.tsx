import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-slate-900 text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-300',
  secondary:
    'border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 disabled:text-slate-400',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300',
}

/** Le dessin d'un bouton, pour un bouton comme pour un lien qui en a l'air. */
export function buttonClass(
  variant: Variant = 'primary',
  className = '',
): string {
  return `inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button {...rest} className={buttonClass(variant, className)}>
      {children}
    </button>
  )
}
