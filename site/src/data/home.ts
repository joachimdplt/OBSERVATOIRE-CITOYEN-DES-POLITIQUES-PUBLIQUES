/**
 * Les textes de l'accueil : le principe et ses garanties, comment
 * l'observatoire se nourrit, la contribution. Repris du cahier
 * des charges (docs/01-mvp.md), sobres et factuels.
 */
export const HOME = {
  hero: {
    title: 'Observatoire citoyen\ndes [[politiques publiques]]',
    lead: 'Les programmes des candidats, cités mot pour mot, à côté des chiffres officiels.',
    cta: 'Explorer la carte',
    guarantees: [
      'Chiffres issus des seules publications officielles',
      'Fichier d’origine conservé, intact',
      'Aucun chiffre calculé, aucune note',
    ],
  },

  comment: {
    title: 'Comment [[ça marche]]',
    steps: [
      {
        title: 'Les candidats',
        text: 'Chaque candidature déclarée publiquement, avec sa source datée.',
      },
      {
        title: 'Leurs programmes',
        text: 'Collectés chaque jour sur leurs sites, découpés en passages cités mot pour mot.',
      },
      {
        title: 'Leurs vidéos',
        text: 'Leurs chaînes officielles, l’Assemblée et le Sénat. Aucun commentaire de tiers.',
      },
      {
        title: 'Les chiffres publics',
        text: 'INSEE, DREES, ministères : lus à la source, gardés tels que publiés.',
      },
      {
        title: 'Les textes déposés',
        text: 'Propositions de loi de l’Assemblée, avec leur auteur et son groupe.',
      },
      {
        title: 'Une API avec clé',
        text: 'Chaque chiffre se relit à sa source ; les données se lisent par une API, avec une clé.',
      },
    ],
    cta: 'La construction technique',
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
