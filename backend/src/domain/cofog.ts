/** Une ligne de la nomenclature COFOG, lue telle que publiée. */
export type CofogEntry = {
  code: string;
  display: string;
  level: 1 | 2;
  parentCode: string | null;
  label: string;
};

/**
 * La liste COFOG publiée par Eurostat (format TSV : « GF0703\tServices
 * hospitaliers »). « GF07 » est une fonction, « GF0703 » une sous-fonction ;
 * la ligne « TOTAL » n'en est pas une. Toute autre ligne est refusée : la
 * liste se lit telle qu'elle est, ou pas du tout.
 */
export function readCofog(tsv: string): CofogEntry[] {
  const out: CofogEntry[] = [];
  for (const raw of tsv.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('TOTAL')) continue;
    const [code, label] = line.split('\t');
    const m = /^GF(\d{2})(\d{2})?$/.exec(code ?? '');
    if (!m || !label) throw new Error(`Ligne COFOG illisible : « ${line} »`);
    const [, division, group] = m;
    out.push(
      group
        ? {
            code,
            display: `${division}.${Number(group)}`,
            level: 2,
            parentCode: `GF${division}`,
            label: label.trim(),
          }
        : {
            code,
            display: division,
            level: 1,
            parentCode: null,
            label: label.trim(),
          },
    );
  }
  return out;
}
