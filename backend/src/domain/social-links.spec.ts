import { accountFromUrl } from './social-links';

describe('les comptes liés depuis un site officiel', () => {
  it('reconnaît une chaîne YouTube et les comptes Instagram, X, TikTok', () => {
    expect(accountFromUrl('https://www.youtube.com/@Natacha.Polony')).toEqual({
      network: 'youtube',
      handle: '@Natacha.Polony',
    });
    expect(
      accountFromUrl(
        'https://www.youtube.com/channel/UCk-_PEY3iC6DIGJKuoEe9bw',
      ),
    ).toEqual({ network: 'youtube', handle: 'UCk-_PEY3iC6DIGJKuoEe9bw' });
    expect(accountFromUrl('https://instagram.com/polony.info')).toEqual({
      network: 'instagram',
      handle: 'polony.info',
    });
    expect(accountFromUrl('https://x.com/NPolony')).toEqual({
      network: 'x',
      handle: 'NPolony',
    });
    expect(accountFromUrl('https://www.tiktok.com/@natachapolony')).toEqual({
      network: 'tiktok',
      handle: 'natachapolony',
    });
  });

  it('écarte les liens de partage et les adresses sans compte', () => {
    expect(accountFromUrl('https://x.com/intent/tweet?text=a')).toBeNull();
    expect(
      accountFromUrl('https://www.youtube.com/watch?v=tQ45aZtNEHk'),
    ).toBeNull();
    expect(accountFromUrl('https://www.facebook.com/NPolony')).toBeNull();
  });
});
