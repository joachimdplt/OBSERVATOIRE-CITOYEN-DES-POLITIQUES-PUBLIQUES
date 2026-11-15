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
    lead: 'Une lecture de l’ensemble de la campagne de chaque candidat, au fil de sa publication : ses programmes en cours, ses livrets, ses sites, ses vidéos, cités mot pour mot.',
    steps: [
      {
        title: 'On suit chaque candidat',
        text: 'Les vingt-cinq candidats déclarés : leurs sites, ceux de leurs partis, leurs chaînes vidéo. Relus chaque jour.',
      },
      {
        title: 'On lit tout, en cours',
        text: 'Programmes complets ou partiels, livrets, contre-budgets, états des lieux, consultations : lus au fil de leur publication, chapitre par chapitre.',
      },
      {
        title: 'On cite, mot pour mot',
        text: 'Chaque passage est repris tel quel, avec son document et sa page. Aucun résumé, aucune reformulation.',
      },
      {
        title: 'On garde chaque version',
        text: 'Un texte qui change entre comme une nouvelle version, daté. L’ancienne reste ; rien ne s’efface.',
      },
      {
        title: 'On dit où en est chacun',
        text: 'Programme complet, documents partiels ou rien de publié : constaté et daté, la même règle pour tous.',
      },
      {
        title: 'Vous lisez autour de chacun',
        text: 'Candidat par candidat, sans note ni classement. Le rangement par sujet, selon la classification officielle de l’ONU, est en préparation.',
      },
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
