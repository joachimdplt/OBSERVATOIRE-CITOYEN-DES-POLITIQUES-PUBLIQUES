import { readingChapters } from './programme-reading';

const doc = { title: 'vdef-programme-1.pdf', url: 'https://ex.fr/p.pdf' };

describe('les chapitres de lecture d’un programme', () => {
  it('un seul document se lit par ses propres titres, avec ses pages', () => {
    const chapters = readingChapters([
      { heading: 'Avant-propos', page: 2, document: doc },
      { heading: 'Avant-propos', page: 3, document: doc },
      { heading: 'Gagner la bataille du climat', page: 15, document: doc },
      { heading: 'Gagner la bataille du climat', page: 16, document: doc },
      { heading: 'Gagner la bataille du climat', page: 16, document: doc },
    ]);
    expect(
      chapters.map((c) => [c.label, c.start, c.count, c.from, c.to]),
    ).toEqual([
      ['Avant-propos', 0, 2, 2, 3],
      ['Gagner la bataille du climat', 2, 3, 15, 16],
    ]);
  });

  it('plusieurs documents se lisent document par document, rubriques dedans', () => {
    const a = { title: 'Sécurité', url: 'https://ex.fr/securite' };
    const b = { title: 'Justice', url: 'https://ex.fr/justice' };
    const c = { title: 'École', url: 'https://ex.fr/ecole' };
    const chapters = readingChapters([
      { heading: 'Police', page: null, document: a },
      { heading: 'Prisons', page: null, document: a },
      { heading: 'Tribunaux', page: null, document: b },
      { heading: 'École', page: null, document: c },
    ]);
    expect(chapters.map((x) => [x.label, x.count, x.headings])).toEqual([
      ['Sécurité', 2, ['Police', 'Prisons']],
      ['Justice', 1, ['Tribunaux']],
      ['École', 1, []],
    ]);
    expect(chapters[0].from).toBeNull();
  });

  it('un PDF sans titre se lit page par page', () => {
    const chapters = readingChapters([
      { heading: doc.title, page: 1, document: doc },
      { heading: doc.title, page: 2, document: doc },
    ]);
    expect(chapters.map((c) => c.label)).toEqual(['Page 1', 'Page 2']);
  });

  it('un passage sans titre reste dans le chapitre en cours', () => {
    const chapters = readingChapters([
      { heading: 'Énergie', page: 3, document: doc },
      { heading: doc.title, page: 4, document: doc },
      { heading: 'École', page: 5, document: doc },
    ]);
    expect(chapters.map((c) => [c.label, c.count])).toEqual([
      ['Énergie', 2],
      ['École', 1],
    ]);
  });
});
