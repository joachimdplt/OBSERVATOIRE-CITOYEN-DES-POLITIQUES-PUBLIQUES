import { rateOf, sampleSize } from './sampling';

describe('le nombre de cartes à vérifier', () => {
  it('demande 97 cartes pour ± 10 points sur une grande population', () => {
    expect(sampleSize(1_000_000)).toBe(97);
  });

  it('réduit le nombre pour une petite population, sans la dépasser', () => {
    expect(sampleSize(225)).toBe(68);
    expect(sampleSize(16)).toBe(14);
    expect(sampleSize(3)).toBe(3);
    expect(sampleSize(0)).toBe(0);
  });
});

describe('le taux de rangements justes', () => {
  it('ne mesure rien sans carte', () => {
    expect(rateOf(0, 0)).toEqual({ measured: false });
  });

  it('donne la marge à 95 %', () => {
    const r = rateOf(90, 100);
    expect(r.measured && r.low).toBeCloseTo(0.841, 3);
    expect(r.measured && r.high).toBeCloseTo(0.959, 3);
  });

  it('prend la règle de trois quand tout est juste', () => {
    const r = rateOf(30, 30);
    expect(r.measured && r.low).toBeCloseTo(0.9, 3);
  });

  it('rétrécit la marge quand une bonne part de la population est vérifiée', () => {
    const sans = rateOf(54, 64);
    const avec = rateOf(54, 64, 182);
    expect(sans.measured && avec.measured).toBe(true);
    if (sans.measured && avec.measured)
      expect(avec.high - avec.low).toBeLessThan(sans.high - sans.low);
  });

  it('n’a plus de marge quand toute la population est vérifiée', () => {
    const r = rateOf(14, 16, 16);
    expect(r.measured && [r.low, r.high]).toEqual([0.875, 0.875]);
  });
});
