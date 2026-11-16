import { WebProgrammeReader } from './web-programme-reader';

type Read = { passages: { heading: string; text: string }[] };
const read = (html: string) =>
  (
    new WebProgrammeReader() as unknown as {
      html: (s: string, u: string) => Read;
    }
  ).html(html, 'https://exemple.fr/projet/');

describe('WebProgrammeReader, liste imbriquée', () => {
  // Réduit de debout-la-france.fr/projet/environnement-energie/ (lu le
  // 15 novembre 2026) : le début de la mesure est dans le point parent.
  it('garde le début d’une mesure écrit avant ses sous-points', () => {
    const r = read(`<main><h3>Diminuer les rejets de gaz à effet de serre</h3>
      <ol><li>Revoir le dispositif de soutien au secteur automobile
        <ul><li>mis en place en 2020, qui coûte 8 milliards d’euros.</li>
        <li>L’Etat investira 1 milliard d’€ par an pour cette mesure.</li></ul>
      </li></ol></main>`);
    expect(r.passages.map((p) => p.text)).toEqual([
      'Revoir le dispositif de soutien au secteur automobile mis en place en 2020, qui coûte 8 milliards d’euros.',
      'L’Etat investira 1 milliard d’€ par an pour cette mesure.',
    ]);
  });
});

describe('WebProgrammeReader, vignettes', () => {
  // Réduit de attalpresident.fr/programme (lu le 16 novembre 2026) : la
  // page se termine par des vignettes vers chaque mesure, lue à part.
  it('ne lit pas une vignette qui renvoie vers une autre page', () => {
    const r = read(`<main><h2>Dette écologique</h2>
      <p>La dette écologique pèse sur les générations qui viennent.</p>
      <a href="/programme/mesures/impots"><span>les cadres et les classes moyennes</span>
        <span>Aucune hausse d'impôts pendant cinq ans, et un salaire net augmenté.</span></a>
      <p>Un lien <a href="/programme/ecole">vers l’école</a> dans une phrase reste lu, lui.</p></main>`);
    expect(r.passages.map((p) => p.text)).toEqual([
      'La dette écologique pèse sur les générations qui viennent.',
      'Un lien vers l’école dans une phrase reste lu, lui.',
    ]);
  });
});
