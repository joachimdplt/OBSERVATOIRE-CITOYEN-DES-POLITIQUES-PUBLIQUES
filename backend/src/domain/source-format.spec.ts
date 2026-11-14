import { formatOf } from './source-format';

describe('le format d’un fichier déposé', () => {
  it('reconnaît les tableurs et les CSV, majuscules comprises', () => {
    expect(formatOf('APL_2024.XLSX')).toBe('xlsx');
    expect(formatOf('rers-2026.csv')).toBe('csv');
  });

  it('refuse les formats que l’observatoire ne sait pas encore lire', () => {
    expect(formatOf('panorama.pdf')).toBeNull();
    expect(formatOf('ancien.xls')).toBeNull();
    expect(formatOf('sans-extension')).toBeNull();
  });
});
