import { SOURCE_CODE } from './project'

/**
 * La page des développeurs : la construction technique et l'API publique.
 * Chaque route décrite existe dans backend/src/features/public ; l'exemple de
 * réponse est une réponse réelle, raccourcie.
 */
export const DEVELOPERS = {
  hero: {
    title: 'Développeurs [[et API]]',
    lead: 'Les données publiées se lisent par une API publique, sans compte ni clé. Le code est libre, sous licence AGPL-3.0.',
    cta: 'Voir le code source',
    href: SOURCE_CODE,
  },

  architecture: {
    title: 'Trois applications, [[une base]]',
    lead: 'Chacune se déploie et se maintient à part.',
    blocks: [
      {
        name: 'site/',
        role: 'Le site public',
        stack:
          'TanStack Start, rendu côté serveur, MapLibre GL sur le fond IGN ADMIN EXPRESS',
      },
      {
        name: 'admin/',
        role: 'L’administration',
        stack:
          'React, TanStack Router et Query, react-hook-form, zod ; rendue dans le navigateur',
      },
      {
        name: 'backend/',
        role: 'L’API',
        stack:
          'NestJS 11, Prisma 7, PostgreSQL 17 ; /api/public sans compte, /api/admin par session',
      },
    ],
  },

  chemin: {
    title: 'Le chemin [[d’une donnée]]',
    steps: [
      {
        title: 'Dépôt',
        text: 'Le fichier du producteur est gardé tel quel, avec son adresse, sa date de collecte et son empreinte SHA-256. Chaque ligne brute est conservée avec son numéro.',
      },
      {
        title: 'Description',
        text: 'L’équipe dit où lire le territoire, la période et chaque indicateur, le séparateur décimal, les marques d’absence du fichier.',
      },
      {
        title: 'Contrôle',
        text: 'Chaque ligne est lue : code INSEE au découpage officiel (COG) déclaré, valeur, absence. Une anomalie bloquante empêche la suite.',
      },
      {
        title: 'Relecture',
        text: 'Brouillon, en relecture, prépublié, publié, remplacé. Une version publiée est relue par une autre personne que son auteur.',
      },
      {
        title: 'Lecture publique',
        text: 'Chaque valeur sort avec sa provenance : producteur, jeu, fichier, empreinte, millésime, ligne d’origine, licences.',
      },
    ],
    guarantees: {
      title: 'Garanties tenues par la base, pas seulement par le code',
      items: [
        'Une ligne brute ne se réécrit pas, une version ne s’efface pas.',
        'Une observation ne change plus hors d’un brouillon.',
        'Une valeur est soit un nombre, soit une catégorie, jamais les deux ; une absence n’a ni l’un ni l’autre.',
        'Une version ne passe à « publiée » que relue par une autre personne.',
      ],
    },
  },

  alimentation: {
    title: 'Comment l’application [[se nourrit]]',
    lead: 'L’outil va chercher lui-même les sources officielles, les garde telles qu’il les a reçues, et dit comment il les a obtenues.',
    ways: [
      {
        title: 'Le fichier déposé',
        text: 'Pour les fichiers qu’il faut lire en entier (colorer la carte de France) : dépôt avec empreinte, description des colonnes, contrôle ligne à ligne, vérification par une puis deux personnes. Les classeurs se lisent en flux.',
        label: 'Vérifiée par son auteur, puis par deux personnes',
      },
      {
        title: 'La collecte du Parlement',
        text: 'Chaque jour, les données ouvertes de l’Assemblée nationale : les textes déposés dont le titre porte un terme surveillé par un article, leur premier signataire, son groupe au jour du dépôt, et chaque article cité mot pour mot.',
        label: 'Collecté automatiquement, non relu',
      },
      {
        title: 'La lecture à la demande',
        text: 'Quand une commune s’ouvre, ses lignes sont lues chez le producteur par l’API tabulaire de data.gouv.fr, sans télécharger le fichier. La lecture est gardée un jour, puis relue seulement si le fichier a changé.',
        label: 'Lu automatiquement à la source',
      },
      {
        title: 'Le miroir (à venir)',
        text: 'Pour les producteurs qui ne publient que de gros fichiers (bases du recensement de l’INSEE) : le fichier est rangé par commune dans une base à côté, relu par la lecture à la demande, et rechargé quand il change chez le producteur.',
        label: 'Lu automatiquement à la source',
      },
    ],
    doc: 'Le détail est dans docs/05-alimentation.md, dans le dépôt.',
  },

  api: {
    title: 'L’API [[publique]]',
    lead: 'Lecture seule, en JSON, ouverte à toute origine. L’adresse de production sera donnée au lancement ; en local : http://localhost:3001.',
    routes: [
      {
        path: '/api/public/indicators',
        query: 'pillar',
        text: 'Les indicateurs publiés, avec leur producteur, leurs millésimes et leur état de vérification.',
      },
      {
        path: '/api/public/indicators/{code}',
        query: '',
        text: 'La fiche d’un indicateur : définition, champ, unité, méthode, limites, périodes, niveaux, provenance.',
      },
      {
        path: '/api/public/indicators/{code}/observations',
        query: 'level, territory, period, limit, offset',
        text: 'Les valeurs, page par page, chacune avec son statut, sa ligne d’origine et son millésime.',
      },
      {
        path: '/api/public/indicators/{code}/map',
        query: 'period, level, region',
        text: 'Toutes les valeurs d’une période en lignes compactes [code, valeur, statut, catégorie, région].',
      },
      {
        path: '/api/public/publications',
        query: '',
        text: 'Les articles lisibles : titre, chapô, pilier, version, état de relecture.',
      },
      {
        path: '/api/public/publications/{slug}',
        query: '',
        text: 'Un article : ses rubriques, les indicateurs choisis et leur justification, les mesures citées mot pour mot, les textes collectés, sa signature et ses versions.',
      },
      {
        path: '/api/public/elections/{slug}',
        query: '',
        text: 'Une élection, son critère d’inscription, et ses candidats déclarés par ordre alphabétique : parti, source de la déclaration, état du programme (complet, partiel, rien de publié), son adresse et la date de la vérification.',
      },
      {
        path: '/api/public/territories/{niveau}/{code}/live',
        query: '',
        text: 'Les valeurs lues à la demande chez le producteur pour une commune, avec la date de la lecture et l’adresse des lignes d’origine.',
      },
      {
        path: '/api/public/territories',
        query: 'q',
        text: 'Les communes et arrondissements dont le nom correspond à la saisie.',
      },
      {
        path: '/api/public/territories/{niveau}/{code}',
        query: '',
        text: 'Un territoire et le découpage officiel d’où il vient.',
      },
      {
        path: '/api/public/territories/{niveau}/{code}/values',
        query: '',
        text: 'Toutes les valeurs publiées pour un territoire, et celles de son département.',
      },
    ],
    example: {
      request:
        'curl "http://localhost:3001/api/public/indicators/apl-medecins-generalistes/observations?territory=45290"',
      response: `{
  "indicator": {
    "code": "apl-medecins-generalistes",
    "unit": "consultations ou visites accessibles par habitant standardisé"
  },
  "total": 3,
  "observations": [
    {
      "territory": { "level": "commune", "code": "45290", "name": "Saint-Martin-d'Abbat" },
      "period": "2022",
      "status": "documented",
      "value": "3.063",
      "sourceRow": 16704,
      "vintage": "2022"
    }
  ],
  "provenance": [
    {
      "status": "preprint",
      "producer": { "acronym": "DREES" },
      "version": {
        "vintage": "2024",
        "fileHash": "21c73deff57dc7a83a3cd6fcfd5b5ceb8c7a40e98590a50b5b1194f2dd4d75a2"
      },
      "licenses": { "data": { "name": "Licence Ouverte v2.0 (Etalab)" } }
    }
  ]
}`,
    },
    notes: [
      'Une valeur est une chaîne, pour garder sa précision exacte : « 3.063 », jamais arrondie.',
      'Une absence a « value » vide et un statut : not_documented, confidential (secret statistique) ou not_applicable.',
      'Un code de territoire se lit avec son niveau : 84 est une région et un département.',
    ],
  },

  regles: {
    title: 'Règles [[de données]]',
    lead: 'Elles s’appliquent à chaque source et à chaque parti.',
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

  licences: {
    title: 'Licences',
    items: [
      { label: 'Code', text: 'AGPL-3.0' },
      { label: 'Contenus de l’observatoire', text: 'CC BY-SA 4.0' },
      {
        label: 'Données',
        text: 'la licence de leur producteur, donnée avec chaque valeur',
      },
    ],
  },
}
