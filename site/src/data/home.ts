import { SOURCE_CODE, newIssue } from './project'

/**
 * Les textes de l'accueil, repris du cahier des charges (docs/01-mvp.md) dans
 * son ordre : le principe directeur, les douze piliers, le parcours de
 * référence, les fonctionnalités, les règles de données. Chaque élément dit
 * s'il est en ligne ou à venir.
 */
export const HOME = {
  hero: {
    title: 'Observatoire citoyen\ndes [[politiques publiques]]',
    lead: 'Partir des statistiques publiques disponibles, les rendre lisibles et les relier aux mesures politiques.',
    cta: 'Explorer les indicateurs',
  },

  piliers: {
    title: 'Douze [[piliers]]',
    lead: 'Chaque pilier s’ouvre au rythme des jeux de données vérifiés.',
    online: (n: number) => `${n} indicateur${n > 1 ? 's' : ''} en ligne`,
    soon: 'À venir',
  },

  parcours: {
    title: 'Du sujet [[à votre commune]]',
    lead: 'Le premier parcours en ligne, tel que le décrit le cahier des charges.',
    steps: [
      { label: 'Santé', soon: false },
      { label: 'Accès aux médecins', soon: false },
      { label: 'Votre commune', soon: false },
      {
        label: 'L’APL, son millésime, sa définition, sa source DREES',
        soon: false,
      },
      {
        label: 'Les propositions des partis sur l’accès aux soins',
        soon: true,
      },
    ],
    cta: 'Suivre ce parcours',
  },

  fiches: {
    title: 'Indicateurs et [[mesures politiques]]',
    items: [
      {
        title: 'Fiche indicateur',
        text: 'Définition, champ, méthode, millésime, liens originaux, limites et statut de relecture.',
        soon: false,
      },
      {
        title: 'Carte',
        text: 'Par commune ou par département, quand le jeu de données et les limites géographiques le permettent.',
        soon: false,
      },
      {
        title: 'Fiche mesure politique',
        text: 'Citation exacte, parti, document, date, territoire, horizon et montants déclarés.',
        soon: true,
      },
      {
        title: 'Comparateur',
        text: 'Situation observée et propositions des partis côte à côte, sans score ni verdict.',
        soon: true,
      },
    ],
  },

  regles: {
    title: 'Règles de données [[non négociables]]',
    items: [
      { label: 'Donnée absente', text: '« non documenté », jamais zéro' },
      {
        label: 'Échelles incompatibles',
        text: 'affichées séparément, la différence expliquée',
      },
      {
        label: 'Besoin chiffré',
        text: 'seulement si un organisme publie la mesure et sa méthode',
      },
      {
        label: 'Comparaison',
        text: 'aucun classement automatique des partis',
      },
      {
        label: 'Correction',
        text: 'une nouvelle version, l’historique visible',
      },
    ],
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
