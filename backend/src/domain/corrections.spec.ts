import { nearestCorrections } from './corrections';

describe('les corrections montrées au modèle', () => {
  const corrections = [
    { text: 'Régularisation de tous les sans-papiers', code: '9' },
    { text: 'Créer des places de crèche et de garde d’enfants', code: '13' },
    { text: 'Bien-être animal dans les abattoirs', code: '4' },
  ];

  it('montre d’abord la correction qui partage le plus de mots', () => {
    expect(
      nearestCorrections(
        'Ouvrir des crèches : 100 000 places de garde',
        corrections,
        1,
      ),
    ).toEqual([corrections[1]]);
  });

  it('ne montre rien qui ne partage aucun mot', () => {
    expect(nearestCorrections('Baisser la TVA', corrections)).toEqual([]);
  });
});
