import { isTopLevel, pageKind, writtenDates } from './site-map';

describe('la carte d’un site de campagne', () => {
  it('reconnaît la nature d’une page, d’après son adresse et son titre', () => {
    expect(
      pageKind(
        'https://becht2027.fr/tour-de-france/journal/etape-du-12-novembre-haut-rhin/',
        'Étape du 12 novembre',
      ),
    ).toBe('agenda');
    expect(
      pageKind(
        'https://becht2027.fr/projet-france/les-5-refondations/',
        'Les 5 refondations',
      ),
    ).toBe('programme');
    expect(
      pageKind('https://natachapolony2027.fr/doleances', 'Cahier de doléances'),
    ).toBe('consultation');
    expect(pageKind('https://natachapolony2027.fr/comites', 'Comités')).toBe(
      'method',
    );
    expect(pageKind('https://x.fr/actualites/un-titre', 'Un titre')).toBe(
      'news',
    );
    expect(pageKind('https://x.fr/mentions-legales', 'Mentions légales')).toBe(
      'other',
    );
  });

  it('lit les dates écrites en toutes lettres', () => {
    expect(
      writtenDates('Le 1er décembre 2026, puis le 12 novembre 2026.'),
    ).toEqual(['2026-11-12', '2026-12-01']);
  });
});

describe('les pages de premier niveau', () => {
  it('reconnaît une page posée à la racine du site, pas un article', () => {
    expect(isTopLevel('https://www.npolony.fr/etat-de-la-france')).toBe(true);
    expect(isTopLevel('https://www.npolony.fr/cahier/')).toBe(true);
    expect(isTopLevel('https://www.npolony.fr/')).toBe(true);
    expect(isTopLevel('https://www.npolony.fr/cahier/probleme/3')).toBe(false);
  });
});
