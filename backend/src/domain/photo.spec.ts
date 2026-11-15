import { isFreeLicence, plainCredit } from './photo';

describe('les photos sous licence libre', () => {
  it('accepte le domaine public, CC0, CC BY et CC BY-SA', () => {
    for (const l of ['CC BY-SA 4.0', 'CC BY 2.0', 'CC0', 'Public domain'])
      expect(isFreeLicence(l)).toBe(true);
  });

  it('écarte une clause non commerciale ou sans modification, et l’inconnu', () => {
    for (const l of ['CC BY-NC-SA 2.0', 'CC BY-ND 4.0', 'Fair use', ''])
      expect(isFreeLicence(l)).toBe(false);
  });

  it('lit le crédit de Commons sans ses balises', () => {
    expect(
      plainCredit(
        '<a href="//commons.wikimedia.org/wiki/User:X">Jean&#039;s photos</a>',
      ),
    ).toBe("Jean's photos");
  });
});
