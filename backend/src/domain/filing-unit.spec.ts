import {
  continuesSentence,
  inLabel,
  isCampaignLogistics,
  isEnumeratedChapter,
  isMeasureList,
  spansSeveralTopics,
} from './filing-unit';

describe('inLabel', () => {
  it('garde un chapitre entier quand il est rangé en entier', () => {
    expect(inLabel({ fromPosition: null }, 0)).toBe(true);
    expect(inLabel({ fromPosition: null, positions: [] }, 7)).toBe(true);
  });

  it('garde un bloc à partir de son premier passage', () => {
    expect(inLabel({ fromPosition: 8 }, 7)).toBe(false);
    expect(inLabel({ fromPosition: 8 }, 9)).toBe(true);
  });

  it('ne garde que les passages rangés un par un', () => {
    const l = { fromPosition: 3, positions: [3, 6] };
    expect(inLabel(l, 3)).toBe(true);
    expect(inLabel(l, 4)).toBe(false);
    expect(inLabel(l, 6)).toBe(true);
  });
});

describe('isCampaignLogistics', () => {
  it('écarte un agenda, un appel aux dons, des réseaux', () => {
    expect(
      isCampaignLogistics(
        'PARIS Dimanche 24 janvier, 15 heures Salle de la Mutualité',
      ),
    ).toBe(true);
    expect(
      isCampaignLogistics(
        'Pour soutenir financièrement la campagne, vous pouvez adresser un chèque à l’ordre de « AFE »',
      ),
    ).toBe(true);
    expect(
      isCampaignLogistics(
        'Instagram nathalie_arthaud_lo Facebook @nathaliearthaud',
      ),
    ).toBe(true);
  });

  it('écarte une signature et un appel à soutenir la campagne', () => {
    expect(
      isCampaignLogistics(
        'Nathalie Arthaud, Arlette Laguiller et Jean-Pierre Mercier.',
      ),
    ).toBe(true);
    expect(
      isCampaignLogistics(
        'Alors aidez-nous à faire connaître ce programme. Rejoignez la campagne de Nathalie Arthaud et soutenez-la !',
      ),
    ).toBe(true);
  });

  it('garde une phrase qui nomme des personnes au milieu d’une position', () => {
    expect(
      isCampaignLogistics(
        'Jordan Bardella ne cache pas ses goûts pour la bourgeoisie.',
      ),
    ).toBe(false);
  });

  it('garde une position politique', () => {
    expect(
      isCampaignLogistics(
        'Il faut baisser le temps et la charge de travail sans perte de salaire pour permettre à tous de vivre.',
      ),
    ).toBe(false);
    expect(
      isCampaignLogistics(
        'Exigeons L’AUGMENTATION des salaires, des retraites et des pensions, le SMIC à 2 200 €',
      ),
    ).toBe(false);
  });
});

describe('isEnumeratedChapter', () => {
  it('reconnaît un chapitre fait de propositions numérotées', () => {
    expect(
      isEnumeratedChapter([
        'Proposition 8 - Simplifier l’État par l’IA.',
        'Proposition 9 - « Buy European First ».',
        'Proposition 10 - Doper la défense par l’IA.',
        'plan Vauban numérique, renfort de l’ANSSI.',
      ]),
    ).toBe(true);
  });

  it('laisse d’un bloc un chapitre suivi, même avec un chiffre en tête', () => {
    expect(
      isEnumeratedChapter([
        'Nous voulons rétablir l’exigence partout.',
        '2 000 professeurs manquent à la rentrée.',
        'Car cet effondrement n’est pas une fatalité.',
      ]),
    ).toBe(false);
  });
});

describe('isMeasureList et spansSeveralTopics', () => {
  const list = [
    'Stopper immédiatement toutes les implantations d’éoliennes.',
    'Etaler les PGE sur 25-30 ans.',
    'Consolider les actions en matière de renseignement.',
    'Réprimer plus durement la petite délinquance.',
  ];

  it('reconnaît une liste de mesures à l’infinitif', () => {
    expect(isMeasureList(list)).toBe(true);
    expect(
      isMeasureList(['Le tourisme souffre.', 'Il faut agir.', 'Vite.']),
    ).toBe(false);
  });

  it('découpe une liste qui change de sujet, pas une liste cohérente', () => {
    expect(spansSeveralTopics(['8', '15', '12', '12'])).toBe(true);
    // Une mesure isolée d’un autre sujet ne suffit pas.
    expect(spansSeveralTopics(['4', '4', '4', '4', '7', null])).toBe(false);
    expect(spansSeveralTopics(['4', null, null])).toBe(false);
  });
});

describe('continuesSentence', () => {
  it('reconnaît la suite d’une phrase coupée', () => {
    expect(
      continuesSentence(
        'et la pérennité de l’activité avant toute distribution aux actionnaires.',
      ),
    ).toBe(true);
    expect(
      continuesSentence('Soutenir la responsabilité des entreprises.'),
    ).toBe(false);
  });
});
