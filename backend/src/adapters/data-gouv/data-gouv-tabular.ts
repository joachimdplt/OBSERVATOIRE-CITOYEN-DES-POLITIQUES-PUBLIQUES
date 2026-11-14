import type { TabularSource } from '../../ports/tabular-source';

const TABULAR = 'https://tabular-api.data.gouv.fr/api/resources';
const CATALOG = 'https://www.data.gouv.fr/api/2/datasets/resources';
const HEADERS = { 'User-Agent': 'observatoire-citoyen (donnees ouvertes)' };
const PAGE = 200;
/** Au-delà, la lecture d'un territoire est anormale : on s'arrête. */
const MAX_PAGES = 25;

/**
 * L'API tabulaire de data.gouv.fr : les lignes d'une ressource filtrées par
 * une colonne, page par page, sans télécharger le fichier.
 */
export class DataGouvTabular implements TabularSource {
  rowsUrl(resourceId: string, column: string, value: string) {
    return `${TABULAR}/${resourceId}/data/?${encodeURIComponent(`${column}__exact`)}=${encodeURIComponent(value)}`;
  }

  async rows(resourceId: string, column: string, value: string) {
    const rows: Record<string, unknown>[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${this.rowsUrl(resourceId, column, value)}&page_size=${PAGE}&page=${page}`;
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`${url} : ${res.status}`);
      const body = (await res.json()) as {
        data: Record<string, unknown>[];
        meta: { total: number };
      };
      rows.push(...body.data);
      if (rows.length >= body.meta.total || body.data.length === 0) break;
    }
    return rows;
  }

  async lastModified(resourceId: string) {
    const res = await fetch(`${CATALOG}/${resourceId}/`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      resource?: { last_modified?: string };
    };
    const date = body.resource?.last_modified;
    return date ? new Date(date) : null;
  }
}
