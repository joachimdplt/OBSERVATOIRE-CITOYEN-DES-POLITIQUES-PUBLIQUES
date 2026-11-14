import { SOURCE_CODE, newIssue } from './project'

/**
 * Les textes de l'accueil, sobres et apolitiques, repris du cahier des
 * charges (docs/01-mvp.md) : ce que fait l'observatoire, nommé simplement.
 * Un seul objectif : chercher une commune. Les passages entre [[ ]] sont surlignés.
 * Aucun chiffre statistique ici, sauf un fait vérifié sur le fichier lui-même.
 */
export const HOME = {
  hero: {
    title: 'Observatoire citoyen\ndes [[politiques publiques]]',
    lead: 'Les statistiques publiques rendues lisibles, et les propositions publiées par les partis rattachées aux mêmes sujets. Sans score ni verdict.',
    cta: 'Chercher une commune',
  },

  constat: {
    title: 'Des chiffres publics, [[difficiles à lire]]',
    lead: 'L’INSEE, la DREES et les ministères les publient dans des fichiers conçus pour les spécialistes.',
    accroche: 'Un seul fichier de la DREES',
    valeur: '313 340',
    legende: 'lignes sur\nles médecins\nde France',
    points: [
      {
        title: 'Des codes, pas des mots',
        text: '«\u00a0045 -Loiret\u00a0», «\u00a0SM54\u00a0», «\u00a0ND\u00a0» : il faut la notice pour comprendre une ligne.',
      },
      {
        title: 'Des sujets séparés',
        text: 'Les propositions des partis sur le même sujet figurent dans d’autres documents.',
      },
    ],
  },

  reponse: {
    title: 'Explorer, comprendre, [[comparer]]',
    lead: 'Du sujet à la commune, puis aux propositions publiées sur ce sujet.',
    items: [
      {
        title: 'Explorer',
        text: 'Douze piliers, de l’agriculture à la culture. Chaque indicateur par commune ou par département, sur une carte.',
      },
      {
        title: 'Comprendre',
        text: 'Définition, champ, méthode, millésime et limites. La phrase de lecture du producteur, mot pour mot.',
      },
      {
        title: 'Comparer',
        text: 'La situation observée et les propositions des partis côte à côte : citation exacte, document d’origine.',
      },
    ],
  },

  regles: {
    title: 'Les mêmes règles [[pour tous]]',
    lead: 'Elles s’appliquent à chaque source et à chaque parti.',
    items: [
      {
        label: 'Une donnée manque',
        text: '«\u00a0non documentée\u00a0», jamais zéro',
      },
      {
        label: 'Un écart, un manque',
        text: 'jamais calculé si la source ne le publie pas',
      },
      {
        label: 'Un parti',
        text: 'aucune note, aucun classement, aucun verdict',
      },
      {
        label: 'Une erreur',
        text: 'une nouvelle version, l’ancienne reste lisible',
      },
    ],
  },

  contribuer: {
    title: 'Contribuez, [[sous votre nom]]',
    lead: 'Comme une encyclopédie : vous proposez, une autre personne relit, tout est signé d’un vrai nom.',
    ways: [
      {
        title: 'Signaler une erreur',
        text: 'Un chiffre faux, une commune mal placée : dites où, citez la source.',
        action: 'Signaler',
        href: newIssue(
          'Erreur : [commune ou indicateur]',
          'Page concernée :\nCe qui est affiché :\nLa source (lien et ligne du fichier) :\n',
        ),
      },
      {
        title: 'Proposer une source',
        text: 'Un fichier public utile : son producteur, son adresse, sa licence.',
        action: 'Proposer',
        href: newIssue(
          'Source : [titre du jeu de données]',
          'Producteur :\nAdresse du fichier :\nLicence :\nQuestion à laquelle il répond :\n',
        ),
      },
      {
        title: 'Relire',
        text: 'Vous vérifiez avant publication, sous votre nom, vos liens politiques affichés.',
        action: 'Devenir relecteur',
        href: newIssue(
          'Relecture : [votre nom]',
          'Nom :\nDomaines (santé, école, logement…) :\nLiens politiques à déclarer (adhésion, mandat, emploi), ou « aucun » :\n',
        ),
      },
      {
        title: 'Écrire le code',
        text: 'Site, administration, API : tout est libre, sous licence AGPL.',
        action: 'Voir le code',
        href: SOURCE_CODE,
      },
    ],
  },

  fin: {
    title: 'Commencer par une commune',
    lead: 'Les contenus sont libres (CC BY-SA 4.0) : reprenez-les, en citant la source.',
    cta: 'Chercher une commune',
  },
}
