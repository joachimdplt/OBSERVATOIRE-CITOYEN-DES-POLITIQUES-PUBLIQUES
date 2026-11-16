import { chooseThreshold, lowerBound, trainingSource } from './calibration';

const results = (spec: [number, number, number][]) =>
  spec.flatMap(([confidence, right, wrong]) => [
    ...Array.from({ length: right }, () => ({ confidence, right: true })),
    ...Array.from({ length: wrong }, () => ({ confidence, right: false })),
  ]);

describe('la source d’apprentissage du classeur', () => {
  it('reste sur l’affiché tant que les verdicts sont trop peu nombreux', () => {
    expect(trainingSource(58, 1)).toBe('displayed');
    expect(trainingSource(400, 2)).toBe('displayed');
  });

  it('passe aux verdicts de personnes quand il y en a assez, assez variés', () => {
    expect(trainingSource(300, 4)).toBe('person');
  });
});

describe('le seuil de confiance mesuré', () => {
  it('prend le plus petit seuil assez juste', () => {
    // À 0,55 : trop d'erreurs ; au-dessus : 100 justes sur 100.
    const r = results([
      [0.55, 30, 20],
      [0.75, 100, 0],
    ]);
    expect(chooseThreshold(r)?.threshold).toBe(0.6);
  });

  it('refuse de ranger seul quand aucun seuil n’est assez juste', () => {
    expect(chooseThreshold(results([[0.9, 40, 20]]))).toBeNull();
  });

  it('ne juge pas un seuil sur trop peu de chapitres', () => {
    expect(chooseThreshold(results([[0.99, 10, 0]]))).toBeNull();
  });

  it('prend la règle de trois quand tout est juste', () => {
    expect(lowerBound(30, 30)).toBeCloseTo(0.9, 5);
  });
});
