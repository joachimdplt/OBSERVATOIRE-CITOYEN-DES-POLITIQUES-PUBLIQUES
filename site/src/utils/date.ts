/** « 2025-12-29 » se lit « 29 décembre 2025 ». */
export function frenchDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}
