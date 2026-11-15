/**
 * Le profil d'un programme lu en entier : ses propositions et ses passages
 * chiffrés. Tout est compté ou cité, rien n'est reformulé ni jugé.
 */

/** Des mots en -er, -ir ou -re qui ne sont pas des verbes. */
const NOT_VERBS = new Set([
  'Notre',
  'Votre',
  'Entre',
  'Contre',
  'Autre',
  'Premier',
  'Dernier',
  'Hier',
  'Leur',
  'Plaisir',
  'Avenir',
  'Pouvoir',
  'Savoir',
  'Devoir',
  'Cadre',
  'Ordre',
  'Nombre',
  'Centre',
  'Titre',
  'Chiffre',
  'Lettre',
  'Ministre',
  'Mer',
  'Fer',
  'Hiver',
  'Quartier',
  'Dossier',
  'Métier',
]);

/** Une proposition : un passage qui commence par un verbe d'action à l'infinitif. */
export function isProposal(text: string): boolean {
  const first =
    text
      .trim()
      .replace(/^[\d.)\s•–-]+/, '')
      .split(/\s+/)[0] ?? '';
  return (
    /^\p{Lu}\p{Ll}+(er|ir|re|oir)$/u.test(first) &&
    first.length > 3 &&
    !NOT_VERBS.has(first)
  );
}

/** Un nombre suivi d'une unité : « 20 % », « 1 700 euros », « 100 milliards ». */
/**
 * Un nombre (« 25 », « 3 200 », « 43,4 ») suivi d'une unité. Une virgule
 * suivie d'un espace coupe : « en 2030, 25 % » ne donne que « 25 % », jamais
 * l'année avec.
 */
const FIGURE =
  /(?<![\d.,])(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,]\d+)?\s?(?:%|€|euros?\b|Mds?\s?€|Mds?\b|Md€|M€|k€|milliards?\b|millions?\b|ans?\b|heures?\b|TWh\b|postes?\b|logements?\b|places?\b)/iu;

/** Un passage chiffré : un nombre suivi d'une unité (%, euros, milliards…). */
export function isFigured(text: string): boolean {
  return FIGURE.test(text);
}
