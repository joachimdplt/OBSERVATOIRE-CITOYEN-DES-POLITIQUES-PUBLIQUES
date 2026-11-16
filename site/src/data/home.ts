/**
 * Les textes de l'accueil : le principe et ses garanties, comment
 * l'observatoire se nourrit, la contribution. Repris du cahier
 * des charges (docs/01-mvp.md), sobres et factuels.
 */
export const HOME = {
  hero: {
    title: 'Observatoire citoyen\ndes [[politiques publiques]]',
    lead: 'Les programmes des candidats, cités mot pour mot, rangés par sujet.',
    cta: 'Explorer la carte',
    guarantees: [
      'Apolitique',
      'Neutre',
      'Vérifiable',
    ],
  },

  comment: {
    title: 'Comment ça marche ?',
    steps: [
      { title: 'On suit', text: '25 candidats, relus chaque matin.' },
      { title: 'On cite', text: 'Mot pour mot, avec le document et la page.' },
      { title: 'On range', text: 'Chaque chapitre dans un sujet.' },
      { title: 'On garde', text: 'Chaque version, datée. Rien ne s’efface.' },
    ],
    cta: 'Lire les candidats',
    technical: 'La construction technique',
  },

  articles: {
    title: 'Articles',
    empty: 'Aucun article publié pour l’instant.',
    read: 'Lire l’article',
  },

  contribuer: {
    title: 'Contribuer, [[sous son nom]]',
    lead: 'Un espace membre arrive : chaque contribution y est signée, puis relue par une autre personne avant publication.',
    soon: 'Bientôt dans l’espace membre',
    more: 'Comment contribuer sans prendre parti →',
    ways: [
      {
        title: 'Signaler une erreur',
        text: 'Un chiffre qui ne correspond pas à sa source : la page, la valeur, la ligne du fichier.',
      },
      {
        title: 'Proposer une source',
        text: 'Un jeu de données public : producteur, adresse, licence.',
      },
      {
        title: 'Relire',
        text: 'Vérifier une version avant publication, liens politiques déclarés et affichés.',
      },
      {
        title: 'Demander une clé d’API',
        text: 'Pour lire les données depuis un autre site ou un programme.',
      },
    ],
  },

  fin: {
    title: 'Explorer les indicateurs',
    lead: 'Contenus sous licence CC BY-NC-SA 4.0. Les données gardent la licence de leur producteur.',
    cta: 'Ouvrir la carte',
  },
}
