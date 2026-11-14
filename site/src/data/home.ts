import { SOURCE_CODE, newIssue } from './project'

/** Les textes de l'accueil. Aucun chiffre statistique ici : ils viennent de l'API, avec leur source. */
export const HOME = {
  title:
    'Les chiffres publics de votre commune, et les propositions des partis',
  lead: 'Tapez le nom de votre commune : l’observatoire montre les statistiques officielles en mots simples, chacune avec sa source. À côté viendront les propositions des partis sur le même sujet, citées mot pour mot.',
  explore: 'Chercher ma commune',
  contribute: 'Contribuer',

  steps: {
    title: 'Comment un chiffre arrive ici',
    items: [
      {
        title: 'Le fichier officiel, tel quel',
        text: 'Les données viennent des producteurs publics : DREES, INSEE, agences régionales de santé. Le fichier est gardé intact, avec son adresse et son empreinte.',
      },
      {
        title: 'Contrôlé, puis relu',
        text: 'Chaque ligne est vérifiée : code de commune, valeur, absence. Une version est d’abord prépubliée par son auteur, puis relue par une autre personne, comme dans une revue scientifique.',
      },
      {
        title: 'Lisible, commune par commune',
        text: 'Une question simple, la phrase de lecture du producteur, l’ordre de grandeur et la valeur exacte. Un clic remonte à la ligne du fichier d’origine.',
      },
      {
        title: 'À côté, les propositions',
        text: 'Les mesures des partis s’afficheront par leur citation exacte et leur document officiel, rangées selon ce sur quoi elles agissent. Sans note ni verdict.',
      },
    ],
  },

  rules: {
    title: 'Les règles',
    items: [
      'Une donnée absente s’affiche « non documentée », jamais zéro.',
      'Aucun chiffre n’est déduit : ni manque, ni besoin, ni écart que la source ne publie pas.',
      'Aucun score, aucun classement, aucun verdict sur un parti.',
      'Toute correction crée une version ; l’ancienne reste lisible.',
    ],
  },

  contribution: {
    title: 'Contribuer à l’observatoire',
    lead: 'L’observatoire fonctionne comme une encyclopédie ouverte : tout le monde peut proposer, rien n’est publié sans relecture, et chaque contribution est signée d’un vrai nom.',
    ways: [
      {
        title: 'Signaler une erreur',
        text: 'Un chiffre qui ne correspond pas au fichier du producteur, une commune mal placée, un texte trompeur : dites où, et citez la source.',
        action: 'Signaler',
        href: newIssue(
          'Erreur : [commune ou indicateur]',
          'Page concernée :\nCe qui est affiché :\nCe que dit la source (lien et ligne du fichier) :\n',
        ),
      },
      {
        title: 'Proposer une source',
        text: 'Un jeu de données public qui éclaire une politique : son producteur, son adresse, sa licence. L’équipe le dépose, le contrôle et le relit.',
        action: 'Proposer',
        href: newIssue(
          'Source : [titre du jeu de données]',
          'Producteur :\nAdresse du fichier :\nLicence :\nQuestion à laquelle il répond :\n',
        ),
      },
      {
        title: 'Relire',
        text: 'Les relecteurs vérifient chaque version avant sa publication. Sous leur vrai nom, avec leurs liens politiques déclarés et affichés ; pour une mesure politique, deux relecteurs.',
        action: 'Devenir relecteur',
        href: newIssue(
          'Relecture : [votre nom]',
          'Nom :\nDomaines (santé, école, logement…) :\nLiens politiques à déclarer (adhésion, mandat, emploi), ou « aucun » :\n',
        ),
      },
      {
        title: 'Améliorer le code',
        text: 'Le code est libre (AGPL-3.0) : site, administration, API. Lisez les conventions du dépôt, puis proposez vos changements.',
        action: 'Voir le code',
        href: SOURCE_CODE,
      },
    ],
    license:
      'Les contenus de l’observatoire sont sous licence CC BY-SA 4.0 : reprenez-les, en citant la source et en partageant à l’identique.',
  },
}
