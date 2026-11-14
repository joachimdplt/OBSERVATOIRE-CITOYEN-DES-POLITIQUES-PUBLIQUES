import type { RowCondition } from '../types/imports'

/**
 * Des conditions en texte, une par ligne : « sexe = 0-Ensemble » garde les
 * lignes égales, « departement ≠ 000-Ensemble » (ou « != ») écarte les autres.
 */
export function parseConditions(text: string): RowCondition[] {
  return text
    .split('\n')
    .map((line) => /^(.+?)\s*(≠|!=|=)\s*(.*)$/.exec(line.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(([, column, op, value]) =>
      op === '='
        ? { column: column.trim(), equals: value.trim() }
        : { column: column.trim(), notEquals: value.trim() },
    )
}

/** L'inverse de `parseConditions`. */
export function formatConditions(conditions: RowCondition[] = []): string {
  return conditions
    .map((c) =>
      c.equals !== undefined
        ? `${c.column} = ${c.equals}`
        : `${c.column} ≠ ${c.notEquals ?? ''}`,
    )
    .join('\n')
}

/** « ND, NC » devient [« ND », « NC »]. */
export const parseMarkers = (text: string) =>
  text
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
