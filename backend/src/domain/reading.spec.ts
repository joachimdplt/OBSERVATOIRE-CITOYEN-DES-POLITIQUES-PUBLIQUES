import { checkReadingTemplate } from './reading';

describe('la phrase de lecture', () => {
  it('tient avec {valeur}, et {territoire} si besoin', () => {
    expect(
      checkReadingTemplate(
        'Les habitants de {territoire} ont accès en moyenne à {valeur} consultations par an.',
      ),
    ).toEqual([]);
  });

  it('refuse une phrase sans valeur, ou avec un champ inconnu', () => {
    expect(
      checkReadingTemplate('Les habitants ont un bon accès.'),
    ).toHaveLength(1);
    expect(checkReadingTemplate('{valeur} pour {commune}')).toHaveLength(1);
  });
});
