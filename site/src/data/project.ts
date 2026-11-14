/** L'adresse du code source et des tickets : l'AGPL demande qu'elle soit donnée. */
export const SOURCE_CODE =
  'https://github.com/joachimdplt/OBSERVATOIRE-CITOYEN-DES-POLITIQUES-PUBLIQUES'

/** Un ticket prérempli : le contributeur n'a qu'à compléter. */
export const newIssue = (title: string, body: string) =>
  `${SOURCE_CODE}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
