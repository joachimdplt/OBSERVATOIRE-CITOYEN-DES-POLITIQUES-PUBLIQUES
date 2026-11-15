import { SOURCE_CODE, newIssue } from './project'

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
        title: 'Une API ouverte',
        text: 'Tout se relit et se réutilise librement. Le code est public.',
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
    lead: 'Les contributions sont séparées de la validation : une autre personne relit avant publication.',
    ways: [
      {
        title: 'Signaler une erreur',
        text: 'Un chiffre qui ne correspond pas à sa source : la page, la valeur, la ligne du fichier.',
        action: 'Signaler',
        href: newIssue(
          'Erreur : [commune ou indicateur]',
          'Page concernée :\nValeur affichée :\nSource (lien et ligne du fichier) :\n',
        ),
      },
      {
        title: 'Proposer une source',
        text: 'Un jeu de données public : producteur, adresse, licence.',
        action: 'Proposer',
        href: newIssue(
          'Source : [titre du jeu de données]',
          'Producteur :\nAdresse du fichier :\nLicence :\nPilier concerné :\n',
        ),
      },
      {
        title: 'Relire',
        text: 'Vérifier une version avant publication, liens politiques déclarés et affichés.',
        action: 'Devenir relecteur',
        href: newIssue(
          'Relecture : [nom]',
          'Nom :\nPiliers :\nLiens politiques à déclarer (adhésion, mandat, emploi), ou « aucun » :\n',
        ),
      },
      {
        title: 'Code source',
        text: 'Site, administration et API, sous licence AGPL-3.0.',
        action: 'Voir le code',
        href: SOURCE_CODE,
      },
    ],
  },

  fin: {
    title: 'Explorer les indicateurs',
    lead: 'Contenus sous licence CC BY-SA 4.0. Les données gardent la licence de leur producteur.',
    cta: 'Ouvrir la carte',
  },
}
