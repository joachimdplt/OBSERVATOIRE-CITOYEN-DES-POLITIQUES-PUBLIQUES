import {
  isParticipationCount,
  consultationFigures,
  isCampaignEvent,
} from './campaign';

describe('la campagne, d’après ses propres publications', () => {
  it('reconnaît un déplacement à ses mots, publiés et les mêmes pour tous', () => {
    expect(
      isCampaignEvent(
        'Étape du 12 novembre : Haut-Rhin',
        'https://becht2027.fr/tour-de-france/journal/etape-du-12-novembre-haut-rhin/',
      ),
    ).toBe(true);
    expect(isCampaignEvent('Grand meeting à Lille', 'https://x.fr/a')).toBe(
      true,
    );
    expect(
      isCampaignEvent(
        'Notre position sur la retraite',
        'https://x.fr/retraite',
      ),
    ).toBe(false);
  });

  it('relève les comptes d’une consultation tels qu’écrits', () => {
    expect(
      consultationFigures([
        { heading: 'Agriculture', text: '161 problèmes · 223 solutions' },
        {
          heading: 'Agriculture',
          text: 'Paysans, élevage, pêche, alimentation, foncier.',
        },
        {
          heading: 'La carte',
          text: '4451 problèmes signalés et publiés. Cliquez sur un territoire.',
        },
      ]),
    ).toEqual([
      { label: 'Agriculture', text: '161 problèmes · 223 solutions' },
      {
        label: 'La carte',
        text: '4451 problèmes signalés et publiés. Cliquez sur un territoire.',
      },
    ]);
  });
});

describe('les comptes publiés par une consultation', () => {
  it('reconnaît un compte de participation, jamais une contribution', () => {
    expect(isParticipationCount('161 problèmes · 223 solutions')).toBe(true);
    expect(
      isParticipationCount('Déjà 4458 problèmes et 5664 solutions publiés.'),
    ).toBe(true);
    expect(
      isParticipationCount('348 sénateurs, 577 députés… à supprimer'),
    ).toBe(false);
    expect(isParticipationCount('Quand et sur quelle chaîne…')).toBe(false);
  });
});
