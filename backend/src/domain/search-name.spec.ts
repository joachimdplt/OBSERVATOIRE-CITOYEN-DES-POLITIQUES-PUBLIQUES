import { matchRank, searchForm } from './search-name';

describe('la recherche d’une commune par son nom', () => {
  it('ignore accents, majuscules, tirets et apostrophes', () => {
    expect(searchForm("Saint-Martin-d'Abbat")).toBe('saint martin d abbat');
    expect(matchRank("Saint-Martin-d'Abbat", 'st martin')).toBe(0);
    expect(matchRank('Évry-Courcouronnes', 'evry')).toBe(0);
    expect(matchRank("Saint-Martin-d'Abbat", 'saintmartin')).toBe(0);
  });

  it('un nom qui contient la saisie vient après un nom qui commence par elle', () => {
    expect(matchRank('Gy-les-Nonains', 'nonains')).toBe(1);
    expect(matchRank('Brest', 'paris')).toBe(-1);
  });
});
