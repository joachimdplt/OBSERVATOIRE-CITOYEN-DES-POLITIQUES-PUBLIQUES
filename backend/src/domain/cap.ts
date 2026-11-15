/**
 * La grille des sujets du Comparative Agendas Project (CAP) : 21 grands
 * sujets et leurs sous-sujets, la grille internationale faite pour ranger
 * les programmes, les lois et les discours par enjeu, sans position.
 * Licence CC BY-NC-SA 4.0. Les intitulés anglais et leurs descriptions sont
 * ceux du livre de codes officiel ; les intitulés français sont une
 * traduction de l'équipe, au plus près de l'anglais.
 */

/** Un sujet de la grille : un grand sujet (« 3 ») ou un sous-sujet (« 331 »). */
export type CapEntry = {
  code: string;
  level: 1 | 2;
  /** Le grand sujet d'un sous-sujet. */
  majorCode: string | null;
  /** L'intitulé officiel, en anglais. */
  title: string;
  /** La description officielle, en anglais (sous-sujets seulement). */
  description: string | null;
};

/**
 * Le livre de codes, lu dans le texte de sa page officielle : « 3. Health »
 * ouvre un grand sujet, « 331: Disease Prevention » un sous-sujet, et la
 * ligne « Description: … » le décrit. Les lignes « See also » et « Note »
 * ne sont pas reprises.
 */
export function readCapCodebook(text: string): CapEntry[] {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const start = lines.findIndex((l) => /^1\.\s+Macroeconomics$/.test(l));
  if (start < 0) return [];
  const entries: CapEntry[] = [];
  let major: string | null = null;
  let current: CapEntry | null = null;
  for (const line of lines.slice(start)) {
    if (/^(COMPARATIVE AGENDAS PROJECT|If you have any questions)/i.test(line))
      break;
    const m = /^(\d{1,2})\.\s+(\S.*)$/.exec(line);
    if (m) {
      major = m[1];
      current = null;
      entries.push({
        code: major,
        level: 1,
        majorCode: null,
        title: m[2],
        description: null,
      });
      continue;
    }
    const s = /^(\d{3,4})\s*:\s*(\S.*)$/.exec(line);
    if (s && major && s[1].startsWith(major)) {
      current = {
        code: s[1],
        level: 2,
        majorCode: major,
        title: s[2],
        description: null,
      };
      entries.push(current);
      continue;
    }
    if (!current) continue;
    const d = /^Description\s*[:;]\s*(.*)$/i.exec(line);
    if (d) current.description = d[1];
    else if (/^(See also|Note)\s*:/i.test(line)) current = null;
    // Une description coupée sur deux lignes se rejoint.
    else if (current.description && !/:$/.test(line))
      current.description = `${current.description}${/\s$|-$/.test(current.description) ? '' : ' '}${line}`;
  }
  return entries;
}

/** Les intitulés français, traduction de l'équipe au plus près de l'anglais. */
export const CAP_FR: Record<string, string> = {
  '1': 'Macroéconomie',
  '100': 'Généralités',
  '101': 'Taux d’intérêt et inflation',
  '103': 'Chômage',
  '104': 'Politique monétaire',
  '105': 'Budget de l’État et dette publique',
  '107': 'Fiscalité',
  '108': 'Politique industrielle',
  '110': 'Contrôle des prix et des salaires',
  '199': 'Autres',
  '2': 'Droits civiques et libertés',
  '200': 'Généralités',
  '201': 'Discriminations envers les minorités',
  '202': 'Discriminations liées au sexe et à l’orientation sexuelle',
  '204': 'Discriminations liées à l’âge',
  '205': 'Discriminations liées au handicap',
  '206': 'Droit de vote',
  '207': 'Liberté d’expression et de religion',
  '208': 'Vie privée',
  '209': 'Mouvements contre l’État',
  '299': 'Autres',
  '3': 'Santé',
  '300': 'Généralités',
  '301': 'Réforme du système de santé',
  '302': 'Assurance maladie',
  '321': 'Industrie pharmaceutique',
  '322': 'Établissements de santé',
  '323': 'Organismes d’assurance santé',
  '324': 'Responsabilité médicale',
  '325': 'Personnels de santé',
  '331': 'Prévention des maladies',
  '332': 'Santé des enfants',
  '333': 'Santé mentale',
  '334': 'Soins de longue durée',
  '335': 'Prise en charge et prix des médicaments',
  '341': 'Tabagisme',
  '342': 'Drogues et alcool',
  '398': 'Recherche et développement',
  '399': 'Autres',
  '4': 'Agriculture',
  '400': 'Généralités',
  '401': 'Commerce agricole',
  '402': 'Aides aux agriculteurs',
  '403': 'Contrôle et sécurité des aliments',
  '404': 'Promotion des produits alimentaires',
  '405': 'Maladies animales et végétales',
  '408': 'Pêche',
  '498': 'Recherche et développement',
  '499': 'Autres',
  '5': 'Travail et emploi',
  '500': 'Généralités',
  '501': 'Sécurité au travail',
  '502': 'Formation professionnelle',
  '503': 'Avantages sociaux des salariés',
  '504': 'Syndicats',
  '505': 'Normes du travail',
  '506': 'Emploi des jeunes',
  '529': 'Travailleurs migrants et saisonniers',
  '599': 'Autres',
  '6': 'Éducation',
  '600': 'Généralités',
  '601': 'Enseignement supérieur',
  '602': 'Écoles primaires et secondaires',
  '603': 'Éducation des publics défavorisés',
  '604': 'Enseignement professionnel',
  '606': 'Éducation spécialisée',
  '607': 'Excellence scolaire',
  '698': 'Recherche et développement',
  '699': 'Autres',
  '7': 'Environnement',
  '700': 'Généralités',
  '701': 'Eau potable',
  '703': 'Traitement des déchets',
  '704': 'Déchets dangereux',
  '705': 'Pollution de l’air',
  '707': 'Recyclage',
  '708': 'Pollutions intérieures',
  '709': 'Espèces et forêts',
  '711': 'Protection des terres et des eaux',
  '798': 'Recherche et développement',
  '799': 'Autres',
  '8': 'Énergie',
  '800': 'Généralités',
  '801': 'Nucléaire',
  '802': 'Électricité',
  '803': 'Gaz naturel et pétrole',
  '805': 'Charbon',
  '806': 'Énergies alternatives et renouvelables',
  '807': 'Économies d’énergie',
  '898': 'Recherche et développement',
  '899': 'Autres',
  '9': 'Immigration',
  '900': 'Immigration',
  '10': 'Transports',
  '1000': 'Généralités',
  '1001': 'Transports en commun',
  '1002': 'Routes',
  '1003': 'Transport aérien',
  '1005': 'Transport ferroviaire',
  '1007': 'Transport maritime',
  '1010': 'Infrastructures de transport',
  '1098': 'Recherche et développement',
  '1099': 'Autres',
  '12': 'Justice et criminalité',
  '1200': 'Généralités',
  '1201': 'Services de police et de justice',
  '1202': 'Délinquance financière',
  '1203': 'Drogues illicites',
  '1204': 'Fonctionnement des tribunaux',
  '1205': 'Prisons',
  '1206': 'Délinquance des mineurs',
  '1207': 'Maltraitance des enfants',
  '1208': 'Droit de la famille',
  '1210': 'Codes pénal et civil',
  '1211': 'Lutte contre la délinquance',
  '1227': 'Police',
  '1299': 'Autres',
  '13': 'Protection sociale',
  '1300': 'Généralités',
  '1302': 'Aide aux personnes à faibles revenus',
  '1303': 'Aide aux personnes âgées',
  '1304': 'Aide aux personnes handicapées',
  '1305': 'Associations et bénévolat',
  '1308': 'Garde d’enfants',
  '1399': 'Autres',
  '14': 'Logement et aménagement',
  '1400': 'Généralités',
  '1401': 'Développement local',
  '1403': 'Développement urbain',
  '1404': 'Logement rural',
  '1405': 'Développement rural',
  '1406': 'Logement des personnes à faibles revenus',
  '1407': 'Logement des anciens combattants',
  '1408': 'Logement des personnes âgées',
  '1409': 'Sans-abri',
  '1498': 'Recherche et développement',
  '1499': 'Autres',
  '15': 'Commerce intérieur et entreprises',
  '1500': 'Généralités',
  '1501': 'Banques',
  '1502': 'Marchés financiers',
  '1504': 'Crédit à la consommation',
  '1505': 'Régulation des assurances',
  '1507': 'Faillites',
  '1520': 'Gestion des entreprises',
  '1521': 'Petites entreprises',
  '1522': 'Droit d’auteur et brevets',
  '1523': 'Catastrophes naturelles',
  '1524': 'Tourisme',
  '1525': 'Sécurité des consommateurs',
  '1526': 'Réglementation du sport',
  '1598': 'Recherche et développement',
  '1599': 'Autres',
  '16': 'Défense',
  '1600': 'Généralités',
  '1602': 'Alliances',
  '1603': 'Renseignement',
  '1604': 'Préparation des forces',
  '1605': 'Armes nucléaires',
  '1606': 'Aide militaire',
  '1608': 'Personnels militaires',
  '1610': 'Achats d’équipements militaires',
  '1611': 'Bases et terrains militaires',
  '1612': 'Réserves',
  '1614': 'Déchets militaires dangereux',
  '1615': 'Défense civile',
  '1616': 'Personnels civils de la défense',
  '1617': 'Entreprises de défense',
  '1619': 'Opérations extérieures',
  '1620': 'Recours contre l’armée',
  '1698': 'Recherche et développement',
  '1699': 'Autres',
  '17': 'Sciences, technologies et communications',
  '1700': 'Généralités',
  '1701': 'Espace',
  '1704': 'Usage commercial de l’espace',
  '1705': 'Transferts de technologies',
  '1706': 'Télécommunications',
  '1707': 'Audiovisuel',
  '1708': 'Météorologie',
  '1709': 'Informatique et numérique',
  '1798': 'Recherche et développement',
  '1799': 'Autres',
  '18': 'Commerce extérieur',
  '1800': 'Généralités',
  '1802': 'Accords commerciaux',
  '1803': 'Exportations',
  '1804': 'Investissements à l’étranger',
  '1806': 'Compétitivité',
  '1807': 'Droits de douane et importations',
  '1808': 'Taux de change',
  '1899': 'Autres',
  '19': 'Affaires internationales',
  '1900': 'Généralités',
  '1901': 'Aide au développement',
  '1902': 'Exploitation des ressources internationales',
  '1905': 'Pays en développement',
  '1906': 'Finance internationale',
  '1910': 'Europe de l’Ouest et Union européenne',
  '1921': 'Relations avec un pays',
  '1925': 'Droits humains',
  '1926': 'Organisations internationales',
  '1927': 'Terrorisme',
  '1929': 'Diplomatie',
  '1999': 'Autres',
  '20': 'Fonctionnement de l’État',
  '2000': 'Généralités',
  '2001': 'Relations entre l’État et les collectivités',
  '2002': 'Administration',
  '2003': 'Service postal',
  '2004': 'Fonction publique',
  '2005': 'Nominations',
  '2006': 'Monnaie',
  '2007': 'Achats publics',
  '2008': 'Patrimoine de l’État',
  '2009': 'Administration fiscale',
  '2010': 'Scandales',
  '2011': 'Relations entre les pouvoirs',
  '2012': 'Campagnes électorales',
  '2013': 'Recensement et statistiques',
  '2014': 'Capitale',
  '2015': 'Recours contre l’État',
  '2030': 'Fêtes nationales',
  '2099': 'Autres',
  '21': 'Terres et ressources publiques',
  '2100': 'Généralités',
  '2101': 'Parcs nationaux',
  '2102': 'Peuples autochtones',
  '2103': 'Terres publiques',
  '2104': 'Ressources en eau',
  '2105': 'Territoires d’outre-mer et dépendances',
  '2199': 'Autres',
  '23': 'Culture',
  '2300': 'Culture',
};
