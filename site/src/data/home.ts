import { SOURCE_CODE, newIssue } from './project'

/**
 * Les textes de l'accueil, un raisonnement en écrans : la question, le
 * constat, la réponse, les garanties, la contribution, l'action. Un seul
 * objectif : chercher sa commune. Les passages entre [[ ]] sont surlignés.
 * Aucun chiffre statistique ici, sauf un fait vérifié sur le fichier lui-même.
 */
export const HOME = {
  hero: {
    title: 'Un médecin près de chez vous, [[facile ou pas ?]]',
    lead: 'Tapez votre commune. Vous lisez les chiffres officiels, en mots simples, avec leur source.',
    cta: 'Chercher ma commune',
  },

  constat: {
    title: 'Les chiffres existent. [[Personne ne les lit.]]',
    lead: 'Ils dorment dans des tableurs, chez la DREES, l’INSEE et les agences régionales de santé.',
    accroche: 'Un seul fichier de la DREES',
    valeur: '313 340',
    legende: 'lignes sur\nles médecins\nde France',
    points: [
      {
        title: 'Des codes, pas des mots',
        text: '«\u00a0045 -Loiret\u00a0», «\u00a0SM54\u00a0», «\u00a0ND\u00a0» : il faut la notice pour comprendre une ligne.',
      },
      {
        title: 'Des chiffres seuls',
        text: 'Les propositions des partis sur le même sujet sont ailleurs, dans d’autres documents.',
      },
    ],
  },

  reponse: {
    title: 'Votre commune, [[lisible en une minute]]',
    lead: 'L’observatoire lit le fichier. Vous lisez la réponse.',
    items: [
      {
        title: 'Une question',
        text: 'Est-ce facile de voir un médecin ? Quel âge ont-ils dans votre département ?',
      },
      {
        title: 'La phrase du producteur',
        text: 'La DREES écrit comment lire son chiffre. Vous lisez sa phrase, mot pour mot.',
      },
      {
        title: 'La ligne d’origine',
        text: 'Chaque chiffre donne son fichier et sa ligne. Vous vérifiez en un clic.',
      },
    ],
  },

  regles: {
    title: 'Aucun chiffre [[inventé]]',
    lead: 'Bientôt, à côté des chiffres : les propositions des partis, citées mot pour mot. Les mêmes règles pour tous.',
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
    title: 'Tapez [[votre commune.]]',
    lead: 'Les contenus sont libres (CC BY-SA 4.0) : reprenez-les, en citant la source.',
    cta: 'Chercher ma commune',
  },
}
