import { readCofog, readCofogNotes } from './cofog';

describe('la nomenclature COFOG, lue telle que publiée', () => {
  it('lit fonctions et sous-fonctions avec leur code usuel', () => {
    expect(
      readCofog('TOTAL\tTotal\nGF07\tSanté\nGF0703\tServices hospitaliers\n'),
    ).toEqual([
      {
        code: 'GF07',
        display: '07',
        level: 1,
        parentCode: null,
        label: 'Santé',
      },
      {
        code: 'GF0703',
        display: '07.3',
        level: 2,
        parentCode: 'GF07',
        label: 'Services hospitaliers',
      },
    ]);
  });

  it('refuse une ligne qui n’est pas une fonction', () => {
    expect(() => readCofog('XX01\tAutre')).toThrow('illisible');
  });
});

describe('les notes explicatives du manuel COFOG', () => {
  it('lit la note de chaque sous-fonction et s’arrête à la fin du chapitre COFOG', () => {
    const manual = [
      'Sommaire 01.1.1 Executive and legislative organs',
      '01.1.1 Executive and legislative organs (CS)',
      '        − Administration of executive and legislative organs;',
      '10.2 OLD AGE',
      '10.2.0 Old age (CS)',
      '        − Provision of social protection against the risks linked to old age;',
      '42',
      '01.1 Food',
      '        − Une autre classification.',
    ].join('\n');
    const notes = readCofogNotes(manual);
    expect(notes.get('01.1')).toBe(
      '01.1.1 Executive and legislative organs. − Administration of executive and legislative organs;',
    );
    expect(notes.get('10.2')).toBe(
      '10.2 OLD AGE. 10.2.0 Old age. − Provision of social protection against the risks linked to old age;',
    );
  });
});
