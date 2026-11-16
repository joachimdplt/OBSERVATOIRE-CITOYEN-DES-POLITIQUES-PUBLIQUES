import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'glass-dark text-white hover:opacity-90 disabled:opacity-40',
  secondary: 'glass text-[#0B1A2A] hover:bg-white/80 disabled:text-slate-400',
  ghost:
    'text-[#5B6470] hover:bg-white/60 hover:text-[#0B1A2A] disabled:text-slate-300',
}

/** Le dessin d'un bouton, pour un bouton comme pour un lien qui en a l'air. */
export function buttonClass(
  variant: Variant = 'primary',
  className = '',
): string {
  return `inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`
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
