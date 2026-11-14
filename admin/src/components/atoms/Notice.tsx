/** Les raisons d'un refus, toutes, telles que l'API les a écrites. */
export function Notice({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {reasons.length === 1 ? (
        reasons[0]
      ) : (
        <ul className="list-disc space-y-1 pl-4">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
