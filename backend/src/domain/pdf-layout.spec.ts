import { readPdfLayout } from './pdf-layout';

const page = (n: number, texts: string[]) =>
  `<page number="${n}" position="absolute" top="0" left="0" height="900" width="600">\n${texts.join('\n')}\n</page>`;
const text = (top: number, font: number, content: string, left = 50) =>
  `<text top="${top}" left="${left}" width="400" height="${font === 1 ? 30 : 14}" font="${font}">${content}</text>`;
const doc = (...pages: string[]) =>
  [
    '<pdf2xml>',
    '<fontspec id="0" size="12" family="Body" color="#000000"/>',
    '<fontspec id="1" size="24" family="Title" color="#000000"/>',
    ...pages,
    '</pdf2xml>',
  ].join('\n');

describe('les titres d’un PDF, lus par la taille des caractères', () => {
  it('range chaque paragraphe sous le titre écrit plus grand, ses lignes jointes', () => {
    const xml = doc(
      page(1, [
        text(20, 0, 'Une France puissante, en-tête de page'),
        text(100, 1, 'Défendre la France'),
        text(132, 1, 'et l’Europe'),
        text(200, 0, 'Nous porterons le budget des armées à 3 % du PIB'),
        text(215, 0, 'dès la première année du mandat, sans exception.'),
        text(260, 0, 'Nous voulons :'),
        text(290, 0, '• Créer une garde nationale de 100 000 volontaires.'),
        text(880, 0, '1'),
      ]),
      page(2, [
        text(20, 0, 'Une France puissante, en-tête de page'),
        text(100, 0, 'Nous voulons :'),
        text(130, 0, '• Construire un porte-avions européen avec nos voisins.'),
      ]),
      page(3, [
        text(20, 0, 'Une France puissante, en-tête de page'),
        text(100, 0, 'Nous voulons :'),
      ]),
    );
    expect(readPdfLayout(xml)).toEqual([
      [
        {
          heading: 'Défendre la France et l’Europe',
          text: 'Nous porterons le budget des armées à 3 % du PIB dès la première année du mandat, sans exception.',
        },
        {
          heading: 'Défendre la France et l’Europe',
          text: 'Créer une garde nationale de 100 000 volontaires.',
        },
      ],
      [
        {
          heading: 'Défendre la France et l’Europe',
          text: 'Construire un porte-avions européen avec nos voisins.',
        },
      ],
      [],
    ]);
  });

  it('un document sans titre plus grand que le texte se lit autrement', () => {
    expect(
      readPdfLayout(doc(page(1, [text(100, 0, 'Un seul corps de texte.')]))),
    ).toBeNull();
  });
});
