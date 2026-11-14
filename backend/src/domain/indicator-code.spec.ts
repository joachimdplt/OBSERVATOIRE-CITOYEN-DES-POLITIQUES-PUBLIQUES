import { readIndicatorCode } from './indicator-code';

describe('le code d’un indicateur', () => {
  it('accepte un code fait pour une adresse', () => {
    expect(readIndicatorCode('apl-medecins-generalistes')).toEqual({
      valid: true,
      code: 'apl-medecins-generalistes',
    });
    expect(readIndicatorCode('eleves-par-classe-rep-plus-2025')).toMatchObject({
      valid: true,
    });
  });

  it('refuse les accents, les majuscules, les espaces et les tirets en trop', () => {
    for (const raw of [
      'élèves-par-classe',
      'APL',
      'apl medecins',
      'apl--medecins',
      '-apl',
    ]) {
      expect(readIndicatorCode(raw)).toMatchObject({ valid: false });
    }
  });

  it('refuse un code trop court pour dire quelque chose', () => {
    expect(readIndicatorCode('ap')).toMatchObject({ valid: false });
  });
});
