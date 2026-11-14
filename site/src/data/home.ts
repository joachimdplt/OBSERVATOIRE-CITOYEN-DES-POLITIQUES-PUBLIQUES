import { SOURCE_CODE, newIssue } from './project'

/**
 * Les textes de l'accueil, la une de l'observatoire : son principe, puis ses
 * articles publiés, les douze piliers et la contribution. Repris du cahier
 * des charges (docs/01-mvp.md), sobres et factuels.
 */
export const HOME = {
  hero: {
    title: 'Observatoire citoyen\ndes [[politiques publiques]]',
    lead: 'Partir des statistiques publiques disponibles, les rendre lisibles et les relier aux mesures politiques.',
    cta: 'Explorer la carte',
  },

  articles: {
    title: 'Articles',
    empty: 'Aucun article publié pour l’instant.',
    read: 'Lire l’article',
  },

  piliers: {
    title: 'Douze [[piliers]]',
    lead: 'Chaque pilier s’ouvre avec ses premiers enjeux publiés.',
    soon: 'À venir',
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
