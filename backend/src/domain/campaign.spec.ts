import { consultationFigures, isCampaignEvent } from './campaign';

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
