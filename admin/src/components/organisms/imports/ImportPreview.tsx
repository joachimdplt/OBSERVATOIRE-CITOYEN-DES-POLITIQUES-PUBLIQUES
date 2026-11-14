import type { ImportJob } from '../../../types/imports'

/** Le fichier tel qu'il a été lu : les colonnes, puis les premières lignes avec leur numéro. */
export function ImportPreview({ job }: { job: ImportJob }) {
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Ligne {job.headerRow}</th>
            {job.columns.map((c, i) => (
              <th
                key={`${c}-${i}`}
                className="whitespace-nowrap px-3 py-2 font-medium text-slate-900"
              >
                {c || <span className="text-slate-300">(vide)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {job.sample.map((r) => (
            <tr key={r.rowNumber}>
              <td className="px-3 py-1.5 text-slate-400">{r.rowNumber}</td>
              {r.cells.map((cell, i) => (
                <td key={i} className="whitespace-nowrap px-3 py-1.5">
                  {cell === '' ? (
                    <span className="text-slate-300">·</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
