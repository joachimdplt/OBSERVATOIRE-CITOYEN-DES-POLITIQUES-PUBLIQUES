import type { ReactNode } from 'react'

/** Un bloc d'accueil : il occupe un écran entier. */
export function Section({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`flex min-h-dvh items-center px-6 py-24 ${className}`}>
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  )
}
