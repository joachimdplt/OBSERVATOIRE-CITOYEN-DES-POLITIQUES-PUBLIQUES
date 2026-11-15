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
    lead: 'Chaque jour, l’observatoire relève les publications des candidats et des partis, les cite mot pour mot et les range par enjeu, à côté des chiffres officiels.',
    steps: [
      {
        title: 'On relève tout',
        text: 'Programmes, livrets, textes déposés à l’Assemblée : collectés chaque jour sur leurs sites et les données ouvertes du Parlement.',
      },
      {
        title: 'On cite, mot pour mot',
        text: 'Chaque proposition est reprise telle quelle, avec le lien vers son document. Aucune reformulation.',
      },
      {
        title: 'On range par enjeu',
        text: 'Logement, retraites, accès aux médecins : chaque passage rejoint l’enjeu dont il parle.',
      },
      {
        title: 'On pose les chiffres à côté',
        text: 'INSEE, DREES, ministères : la situation réelle, commune par commune, lue à la source.',
      },
      {
        title: 'On suit leurs vidéos',
        text: 'Leurs chaînes officielles, l’Assemblée et le Sénat : leurs mots, sans commentaire de tiers.',
      },
      {
        title: 'Vous comparez',
        text: 'Enjeu par enjeu, candidat par candidat. Aucune note, aucun classement.',
      },
    ],
    cta: 'Voir les enjeux',
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
