import { parse } from 'csv-parse/sync';
import { TerritoryLevel } from '../../generated/prisma/enums';
import type { TerritoryRecord } from '../../domain/territory-code';

type Row = Record<string, string>;

const rows = (csv: string): Row[] =>
  parse<Row>(csv, { columns: true, skip_empty_lines: true, bom: true });

const orNull = (value: string | undefined) => (value ? value : null);

/**
 * Les fichiers du Code officiel géographique, tels que l'INSEE les publie
 * (v_region_AAAA.csv, v_departement_AAAA.csv, v_commune_AAAA.csv). Le nom
 * retenu est `LIBELLE`, le nom d'usage avec son article (« Les Abymes »).
 *
 * Du fichier des communes, seules les communes (COM) et les arrondissements
 * municipaux (ARM) sont repris : les communes associées et déléguées n'ont
 * pas de statistiques propres.
 */
export function readCog(files: {
  regions: string;
  departments: string;
  communes: string;
}) {
  const regions: TerritoryRecord[] = rows(files.regions).map((r) => ({
    level: TerritoryLevel.region,
    code: r.REG,
    name: r.LIBELLE,
    regionCode: null,
    departmentCode: null,
    communeCode: null,
  }));
  const departments: TerritoryRecord[] = rows(files.departments).map((r) => ({
    level: TerritoryLevel.department,
    code: r.DEP,
    name: r.LIBELLE,
    regionCode: r.REG,
    departmentCode: null,
    communeCode: null,
  }));
  const communes: TerritoryRecord[] = rows(files.communes)
    .filter((r) => r.TYPECOM === 'COM' || r.TYPECOM === 'ARM')
    .map((r) => ({
      level:
        r.TYPECOM === 'COM'
          ? TerritoryLevel.commune
          : TerritoryLevel.municipal_district,
      code: r.COM,
      name: r.LIBELLE,
      regionCode: orNull(r.REG),
      departmentCode: orNull(r.DEP),
      communeCode: r.TYPECOM === 'ARM' ? orNull(r.COMPARENT) : null,
    }));

  const france: TerritoryRecord = {
    level: TerritoryLevel.country,
    code: 'FR',
    name: 'France',
    regionCode: null,
    departmentCode: null,
    communeCode: null,
  };
  return [france, ...regions, ...departments, ...communes];
}
