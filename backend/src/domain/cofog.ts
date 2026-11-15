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

/**
 * Les notes explicatives du manuel COFOG de l'ONU (série M n° 84), converti
 * en texte : pour chaque sous-fonction (« 07.3 »), sa note et celles de ses
 * classes, bout à bout. Le manuel couvre quatre classifications ; seul le
 * chapitre COFOG est lu, du « 01.1.1 » jusqu'à la fin de la fonction 10.
 */
export function readCofogNotes(manual: string): Map<string, string> {
  const lines = manual.split('\n');
  const code =
    /^\s*(\d{2})\.(\d)(?:\.(\d))?\s+(\S.*?)(?:\s+\((?:CS|IS)\))?\s*$/;
  // Le chapitre commence à la première classe 01.1.1 suivie de sa note.
  let start = lines.findIndex(
    (l, i) =>
      /^\s*01\.1\.1\s+Executive and legislative organs/.test(l) &&
      lines.slice(i + 1, i + 4).some((n) => n.includes('−')),
  );
  if (start < 0) start = 0;
  const notes = new Map<string, string[]>();
  let current: string | null = null;
  let reachedTen = false;
  for (const line of lines.slice(start)) {
    const m = code.exec(line);
    if (m && line.trim().length < 140) {
      const division = Number(m[1]);
      if (division === 10) reachedTen = true;
      // Une autre classification recommence à 01 : le chapitre COFOG est fini.
      if (reachedTen && division < 10) break;
      const group = `${m[1]}.${m[2]}`;
      current = group;
      const list = notes.get(group) ?? [];
      list.push(`${m[3] ? `${group}.${m[3]}` : group} ${m[4].trim()}.`);
      notes.set(group, list);
      continue;
    }
    const text = line.trim();
    if (current && text && !/^\d+$/.test(text)) notes.get(current)!.push(text);
  }
  return new Map(
    [...notes.entries()].map(([g, parts]) => [
      g,
      parts.join(' ').replace(/\s+/g, ' ').trim(),
    ]),
  );
}
