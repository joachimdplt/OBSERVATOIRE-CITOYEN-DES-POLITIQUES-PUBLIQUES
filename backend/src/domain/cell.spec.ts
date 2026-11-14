import { readCell } from './cell';

describe('la lecture d’une case', () => {
  it('lit la virgule décimale et les espaces de milliers français', () => {
    expect(readCell('3,3', ',')).toMatchObject({ kind: 'value', value: '3.3' });
    expect(readCell('367 300', ',')).toMatchObject({ value: '367300' });
    expect(readCell('367 300', ',')).toMatchObject({ value: '367300' });
    expect(readCell('-0,5', ',')).toMatchObject({ value: '-0.5' });
  });

  it('lit le point décimal d’un tableur, notation scientifique comprise', () => {
    expect(readCell('3.2871', '.')).toMatchObject({ value: '3.2871' });
    expect(readCell('1e-7', '.')).toMatchObject({ value: '1e-7' });
  });

  it('une case vide n’est jamais un zéro', () => {
    expect(readCell('', ',')).toEqual({
      kind: 'absence',
      status: 'not_documented',
    });
    expect(readCell('  ', ',')).toEqual({
      kind: 'absence',
      status: 'not_documented',
    });
    expect(readCell('nd', ',')).toEqual({
      kind: 'absence',
      status: 'not_documented',
    });
    expect(readCell('-', ',')).toEqual({
      kind: 'absence',
      status: 'not_documented',
    });
  });

  it('un vrai zéro reste un zéro', () => {
    expect(readCell('0', ',')).toMatchObject({ kind: 'value', value: '0' });
  });

  it('distingue le secret statistique et le sans objet', () => {
    expect(readCell('s', ',')).toEqual({
      kind: 'absence',
      status: 'confidential',
    });
    expect(readCell('Sans objet', ',')).toEqual({
      kind: 'absence',
      status: 'not_applicable',
    });
  });

  it('ne devine pas un séparateur qui n’est pas celui déclaré', () => {
    expect(readCell('3.300', ',')).toMatchObject({ kind: 'invalid' });
    expect(readCell('3,3', '.')).toMatchObject({ kind: 'invalid' });
  });

  it('refuse un texte ou une marque inconnue', () => {
    expect(readCell('12 %', ',')).toMatchObject({ kind: 'invalid' });
    expect(readCell('environ 3', ',')).toMatchObject({ kind: 'invalid' });
    expect(readCell('x', ',')).toMatchObject({ kind: 'invalid' });
  });
});
