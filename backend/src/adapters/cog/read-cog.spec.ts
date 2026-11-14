import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TerritoryLevel } from '../../generated/prisma/enums';
import { readCog } from './read-cog';

const FIXTURES = join(__dirname, '../../../test/fixtures/cog-2026');
const file = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

describe('les fichiers du COG', () => {
  const territories = readCog({
    regions: file('v_region_2026.csv'),
    departments: file('v_departement_2026.csv'),
    communes: file('v_commune_2026.csv'),
  });
  const find = (level: TerritoryLevel, code: string) =>
    territories.find((t) => t.level === level && t.code === code);

  it('commence par la France', () => {
    expect(territories[0]).toMatchObject({ level: 'country', code: 'FR' });
  });

  it('garde 84 comme région et comme département', () => {
    expect(find(TerritoryLevel.region, '84')?.name).toBe(
      'Auvergne-Rhône-Alpes',
    );
    expect(find(TerritoryLevel.department, '84')?.name).toBe('Vaucluse');
  });

  it('prend le nom d’usage, article compris', () => {
    expect(find(TerritoryLevel.commune, '97101')?.name).toBe('Les Abymes');
  });

  it('rattache un arrondissement municipal à sa commune', () => {
    expect(find(TerritoryLevel.municipal_district, '13201')).toMatchObject({
      communeCode: '13055',
      departmentCode: '13',
    });
  });

  it('laisse de côté les communes déléguées', () => {
    expect(territories.some((t) => t.name === 'Arbignieu')).toBe(false);
  });
});
