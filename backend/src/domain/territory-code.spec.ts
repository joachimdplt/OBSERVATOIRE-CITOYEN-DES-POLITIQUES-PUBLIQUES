import { TerritoryLevel } from '../generated/prisma/enums';
import { readTerritoryCode } from './territory-code';

describe('les codes INSEE', () => {
  it('accepte les codes de la Corse et des départements d’outre-mer', () => {
    expect(readTerritoryCode(TerritoryLevel.commune, '2A004')).toEqual({
      valid: true,
      code: '2A004',
      repaired: false,
    });
    expect(readTerritoryCode(TerritoryLevel.department, '971')).toMatchObject({
      valid: true,
    });
    expect(readTerritoryCode(TerritoryLevel.department, '2b')).toMatchObject({
      valid: true,
      code: '2B',
    });
  });

  it('rend le zéro qu’un tableur a effacé, et le dit', () => {
    expect(readTerritoryCode(TerritoryLevel.commune, '1001')).toEqual({
      valid: true,
      code: '01001',
      repaired: true,
    });
    expect(readTerritoryCode(TerritoryLevel.department, '1')).toMatchObject({
      code: '01',
      repaired: true,
    });
  });

  it('ne devine rien d’autre', () => {
    expect(readTerritoryCode(TerritoryLevel.commune, '101')).toMatchObject({
      valid: false,
    });
    expect(readTerritoryCode(TerritoryLevel.commune, 'Paris')).toMatchObject({
      valid: false,
    });
    expect(readTerritoryCode(TerritoryLevel.region, '840')).toMatchObject({
      valid: false,
    });
  });
});
