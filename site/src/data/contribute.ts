/**
 * Les textes de la page Contribuer. Ils reprennent les règles de
 * CONVENTIONS.md (sections 1.5, 1.7, 1.8 et 1.10) : une règle changée là
 * se change ici.
 */
export const CONTRIBUTE = {
  hero: {
    title: 'Contribuer',
    lead: 'L’observatoire ne prend parti pour aucune formation. Y contribuer, c’est apporter une source ou vérifier un fait, jamais défendre une opinion. Les mêmes règles valent pour chaque contribution, quelle que soit la formation concernée.',
  },

  rule: {
    title: 'La source, pas l’opinion',
    items: [
      {
        title: 'Une preuve',
        text: 'Une contribution s’appuie sur une source publique : un document, un jeu de données, une citation mot pour mot avec son adresse.',
      },
      {
        title: 'Aucun jugement',
        text: 'Aucun mot qui juge une formation ou une personne, aucun score, aucun classement, aucune couleur partisane.',
      },
      {
        title: 'Rien de déduit',
        text: 'Aucun besoin, manque, coût ou écart que la source ne publie pas. Une donnée absente s’affiche « non documenté », jamais zéro.',
      },
    ],
  },

  ways: {
    title: 'Quatre façons de contribuer',
    items: [
      {
        title: 'Vérifier un rangement',
        status: 'Ouvert à l’équipe',
        open: true,
        text: 'Les chapitres des programmes sont rangés par sujet par une machine. Une carte montre le texte du candidat mot pour mot, puis le sujet donné par la machine. La personne valide ou refuse. Les cartes sont tirées au hasard, en nombre suffisant pour chaque candidat ; seuls ces verdicts mesurent la fiabilité du rangement.',
      },
      {
        title: 'Signaler une erreur',
        status: 'À venir',
        open: false,
        text: 'Un chiffre ou une citation qui ne correspond pas à sa source : la page, la valeur affichée, et l’endroit de la source où lire la bonne.',
      },
      {
        title: 'Proposer une source',
        status: 'À venir',
        open: false,
        text: 'Un document ou un jeu de données public : son producteur, son adresse, sa licence. Une source non publique ne peut pas être citée.',
      },
      {
        title: 'Relire',
        status: 'À venir',
        open: false,
        text: 'Vérifier une contribution avant qu’elle soit publiée : chaque valeur contre sa source, chaque libellé contre sa citation.',
      },
    ],
  },

  people: {
    title: 'Sous son nom, engagements déclarés',
    paragraphs: [
      'Chaque contribution est signée du vrai nom de son auteur, visible du public. Le courriel ne se montre jamais.',
      'Chacun déclare ses engagements : adhésion, mandat, candidature, emploi auprès d’un parti ou d’un élu. Ils s’affichent à côté de ses contributions et de ses relectures. Personne n’est écarté pour ses engagements : ils limitent les décisions qu’une personne peut prendre seule, et le lecteur juge.',
      'Une personne qui demande l’effacement de ses données voit son nom remplacé par « contributeur anonymisé » ; l’historique reste entier.',
    ],
  },

  circuit: {
    title: 'Le parcours d’une contribution',
    steps: [
      {
        title: 'Signée',
        text: 'L’auteur soumet sa contribution sous son nom, avec sa source.',
      },
      {
        title: 'Relue',
        text: 'Une autre personne la vérifie. Pour une mesure politique, deux relecteurs, dont au moins un sans engagement déclaré. Avant un scrutin, deux relecteurs pour tout.',
      },
      {
        title: 'Publiée avec sa trace',
        text: 'Les décisions de relecture sont publiques et signées.',
      },
      {
        title: 'Corrigée par une version',
        text: 'Une correction ne réécrit rien : elle crée une nouvelle version, et l’ancienne reste consultable avec la date et la raison du changement.',
      },
    ],
  },

  refused: {
    title: 'Refusé, quelle que soit la formation',
    items: [
      'Un avis sur un candidat, un parti ou une mesure.',
      'Un mot de verdict, un score, un classement.',
      'Un chiffre calculé que la source ne publie pas.',
      'Une valeur sans producteur, jeu, millésime, unité ou périmètre.',
      'Une mesure politique sans sa citation exacte et son document.',
      'Le fichier complet d’un document politique : on publie l’extrait et le lien.',
    ],
  },

  contest: {
    title: 'Une formation qui conteste',
    paragraphs: [
      'Toute formation ou personne mise en cause peut demander une rectification ou l’insertion d’une réponse. La procédure est la même pour toutes, sans exception ni voie rapide.',
      'Chaque demande est enregistrée avec sa date de réception et la décision prise. Une rectification crée une nouvelle version ; une réponse insérée s’affiche sur la fiche concernée, signée par son auteur et distinguée du contenu de l’observatoire.',
      'Le formulaire de demande ouvrira avec l’espace membre.',
    ],
  },

  licence: {
    title: 'Licence',
    text: 'Les contributions sont publiées sous licence CC BY-NC-SA 4.0, comme le reste du contenu de l’observatoire. Les données gardent la licence de leur producteur ; les citations des partis restent la propriété de leur auteur.',
  },
}
