/**
 * Le profil d'un programme lu en entier : ses propositions. Tout est cité,
 * rien n'est reformulé ni jugé.
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
