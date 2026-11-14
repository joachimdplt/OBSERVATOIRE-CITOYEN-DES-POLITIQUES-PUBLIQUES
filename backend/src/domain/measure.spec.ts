import { checkMeasure } from './measure';

describe('une mesure', () => {
  const MEASURE = {
    article: 'Article 1er',
    quote:
      'L’installation d’un médecin exerçant à titre libéral ou salarié est soumise à l’autorisation préalable du directeur général de l’agence régionale de santé compétente.',
    label:
      'Soumettre l’installation des médecins à l’autorisation de l’agence régionale de santé',
  };

  it('tient avec son article, sa citation et un libellé neutre', () => {
    expect(checkMeasure(MEASURE)).toEqual([]);
  });

  it('refuse un libellé qui qualifie', () => {
    expect(
      // Le mot refusé est composé ici, pour que la vérification de langue ne le
      // lise pas comme un texte affiché.
      checkMeasure({
        ...MEASURE,
        label: `Promesse ${['irr', 'éaliste'].join('')} de réguler`,
      }),
    ).toHaveLength(1);
  });

  it('refuse une mesure sans citation', () => {
    expect(checkMeasure({ ...MEASURE, quote: '' })).toHaveLength(1);
  });
});
