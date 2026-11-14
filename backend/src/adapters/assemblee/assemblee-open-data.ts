import JSZip from 'jszip';
import type { GroupMandate } from '../../domain/parliament';
import type {
  FiledText,
  Member,
  ParliamentSource,
} from '../../ports/parliament-source';

const REPOSITORY =
  'https://data.assemblee-nationale.fr/static/openData/repository/17';
const DOSSIERS = `${REPOSITORY}/loi/dossiers_legislatifs/Dossiers_Legislatifs.json.zip`;
const MEMBERS = `${REPOSITORY}/amo/tous_acteurs_mandats_organes_xi_legislature/AMO30_tous_acteurs_tous_mandats_tous_organes_historique.json.zip`;
const SITE = 'https://www.assemblee-nationale.fr';
/** Un client générique : aucune information sur l'équipe ne part avec la requête. */
const HEADERS = { 'User-Agent': 'observatoire-citoyen (donnees ouvertes)' };

/** Un dépôt à l'Assemblée, sans ses textes de commission ni ses textes adoptés. */
const FILED = /^(PION|PRJL)ANR5L17B(\d+)$/;

type Json = Record<string, unknown>;
/** Une valeur texte du JSON, ou une chaîne vide. */
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const asList = <T>(v: T | T[] | null | undefined): T[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

async function zipOf(url: string): Promise<JSZip> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  return JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
}

async function jsonFiles(zip: JSZip, folder: string): Promise<Json[]> {
  const files = Object.values(zip.files).filter(
    (f) => !f.dir && f.name.includes(`/${folder}/`) && f.name.endsWith('.json'),
  );
  const out: Json[] = [];
  for (const f of files) out.push(JSON.parse(await f.async('string')) as Json);
  return out;
}

/**
 * Les données ouvertes de l'Assemblée nationale, 17e législature : les
 * dossiers législatifs (textes déposés, auteurs, dates), les députés et
 * l'historique de leurs groupes, et le texte intégral de chaque dépôt.
 */
export class AssembleeOpenData implements ParliamentSource {
  readonly groupsSource = MEMBERS;

  async listTexts(): Promise<FiledText[]> {
    const documents = await jsonFiles(await zipOf(DOSSIERS), 'document');
    const texts: FiledText[] = [];
    for (const wrapper of documents) {
      const d = wrapper.document as Json;
      const uid = String(d.uid);
      const match = FILED.exec(uid);
      if (!match) continue;
      const title = str((d.titres as Json)?.titrePrincipal).trim();
      const chrono = ((d.cycleDeVie as Json)?.chrono ?? {}) as Json;
      const filedAt = str(chrono.dateDepot).slice(0, 10);
      if (!title || !filedAt) continue;
      const authors = asList(
        ((d.auteurs as Json)?.auteur ?? null) as Json | Json[],
      );
      const firstAuthorRef =
        (authors
          .map((a) => (a.acteur as Json | undefined)?.acteurRef)
          .find(Boolean) as string | undefined) ?? null;
      const number = match[2];
      const government = match[1] === 'PRJL';
      texts.push({
        sourceRef: uid,
        kind: government ? 'government_bill' : 'bill',
        chamber: 'national_assembly',
        title: title[0].toUpperCase() + title.slice(1),
        number: String(Number(number)),
        filedAt,
        firstAuthorRef: government ? null : firstAuthorRef,
        url: `${SITE}/dyn/17/textes/l17b${number}_${government ? 'projet' : 'proposition'}-loi`,
        textUrl: `${SITE}/dyn/opendata/${uid}.html`,
      });
    }
    return texts;
  }

  async members(): Promise<Map<string, Member>> {
    const zip = await zipOf(MEMBERS);
    const organes = new Map<string, string>();
    for (const wrapper of await jsonFiles(zip, 'organe')) {
      const o = wrapper.organe as Json;
      organes.set(String(o.uid), String(o.libelle));
    }
    const members = new Map<string, Member>();
    for (const wrapper of await jsonFiles(zip, 'acteur')) {
      const a = wrapper.acteur as Json;
      const ident = ((a.etatCivil as Json)?.ident ?? {}) as Json;
      const ref = String(((a.uid as Json)?.['#text'] as string) ?? a.uid);
      const groups: GroupMandate[] = [];
      for (const m of asList(
        ((a.mandats as Json)?.mandat ?? null) as Json | Json[],
      )) {
        if (m.typeOrgane !== 'GP') continue;
        const organe = asList(
          ((m.organes as Json)?.organeRef ?? null) as string | string[],
        )[0];
        const group = organe ? organes.get(organe) : undefined;
        if (!group || !m.dateDebut) continue;
        groups.push({
          group,
          start: str(m.dateDebut),
          end: str(m.dateFin) || null,
        });
      }
      members.set(ref, {
        name: `${String(ident.prenom)} ${String(ident.nom)}`,
        groups,
      });
    }
    return members;
  }

  async fetchText(textUrl: string): Promise<string> {
    const res = await fetch(textUrl, { headers: HEADERS });
    if (!res.ok) throw new Error(`${textUrl} : ${res.status}`);
    return res.text();
  }
}
