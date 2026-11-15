/**
 * Le rattachement à la grille d'une démarche qui n'est pas un programme :
 * les indicateurs d'un état des lieux et les thèmes d'une consultation.
 * Une table fixe, écrite et relue par l'équipe : aucun modèle n'intervient.
 * Un indicateur ou un thème absent de la table ne s'affiche dans aucun
 * sujet (il reste lisible sur la page du candidat).
 */

const normalize = (s: string | null | undefined) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Les indicateurs de l'état des lieux, par leur nom, et leur sujet. */
const INDICATORS: Record<string, string> = {
  // Ce que la vie coûte
  inflation: '1',
  'prix du gazole': '8',
  'prix du gazole par departement': '8',
  "prix de l'electricite": '8',
  'les prix et le smic': '1',
  'hausse des prix par poste': '1',
  'dette publique': '1',
  'personnes sous le seuil de pauvrete': '13',
  'beneficiaires du rsa': '13',
  'prix des logements rapporte aux revenus': '14',
  'prix des logements anciens': '14',
  'logements mis en chantier': '14',
  'logements vacants': '14',
  'part des soins payee directement par les menages': '3',
  // Naître et se soigner
  naissances: '13',
  fecondite: '13',
  'mortalite infantile': '3',
  'mortalite infantile par departement': '3',
  // Les services qui partent
  'communes sans service, par departement': '14',
  "lits d'hopital": '3',
  maternites: '3',
  'medecins generalistes': '3',
  'medecins generalistes par departement': '3',
  'bureaux de poste': '20',
  'passages aux urgences': '3',
  'lits de psychiatrie': '3',
  'places en ehpad pour 1 000 personnes de 75 ans ou plus': '13',
  "beneficiaires de l'allocation personnalisee d'autonomie": '13',
  "allocataires de l'allocation aux adultes handicapes": '13',
  'lignes de chemin de fer exploitees': '10',
  // L'école qui recule
  'eleves de 15 ans en difficulte': '6',
  'le chomage selon le diplome': '5',
  'jeunes en difficulte de lecture': '6',
  'jeunes en difficulte de lecture par departement': '6',
  'aides humaines prescrites aux eleves handicapes et reellement assurees': '6',
  "accompagnants d'eleves handicapes (aesh)": '6',
  'eleves en situation de handicap scolarises en milieu ordinaire': '6',
  "postes pourvus aux concours d'enseignants": '6',
  "salaire d'un professeur des ecoles apres quinze ans, inflation deduite": '6',
  'enseignants contractuels dans les colleges et lycees publics': '6',
  'ecoles maternelles et elementaires': '6',
  'eleves par classe': '6',
  'eleves des ecoles privees hors contrat': '6',
  'jeunes ni en emploi ni en formation': '5',
  "jeunes sortis de l'ecole sans diplome": '6',
  "eleves par enseignant a l'ecole primaire": '6',
  "depense publique d'education": '6',
  // Un État débordé
  'demandes de logement social en attente': '14',
  "demandes d'asile": '9',
  "mesures d'eloignement : prononcees, executees": '9',
  'detenus pour 100 places de prison': '12',
  "duree d'une affaire civile": '12',
  "delai de mise a execution d'une peine de prison ferme": '12',
  'premiers titres de sejour delivres': '9',
  'volume du droit en vigueur': '20',
  'articles de loi et de reglement en vigueur': '20',
  // La sécurité
  'violences physiques': '12',
  'violences physiques dans la famille : femmes et hommes victimes': '12',
  'les enfants victimes de violences': '12',
  'la delinquance enregistree, par departement': '12',
  'violences sexuelles': '12',
  "tentatives d'homicide": '12',
  homicides: '12',
  'agressions graves': '12',
  'infractions liees aux stupefiants': '12',
  'escroqueries et fraudes aux moyens de paiement': '12',
  'infractions liees au numerique': '12',
  cambriolages: '12',
  'vols violents sans arme': '12',
  // L'argent public
  "ce que l'etat depense, ce qu'il preleve": '1',
  'solde des comptes publics': '1',
  'interets de la dette publique': '1',
  'agents de la fonction publique, par employeur': '20',
  'agents de la fonction publique': '20',
  'agents publics pour 100 habitants': '20',
  // Le travail et la retraite
  'salaire net median': '5',
  "pouvoir d'achat du salaire net moyen": '5',
  'salaries payes au smic': '5',
  'pension de retraite moyenne': '5',
  'personnes en emploi pour un retraite': '5',
  'personnes de 65 ans ou plus pour 100 personnes de 15 a 64 ans': '5',
  retraites: '5',
  'age de depart a la retraite': '5',
  'depenses de retraite': '5',
  'allocataires du minimum vieillesse': '13',
  // La démocratie
  "abstention a l'election presidentielle": '20',
  'abstention au premier tour des elections legislatives': '20',
  'abstention au premier tour de la presidentielle, par departement': '20',
  'abstention aux elections locales': '20',
  'abstention aux elections europeennes': '20',
  'referendums nationaux depuis 1961': '20',
  'abstention aux referendums': '20',
  "recours a l'article 49, alinea 3": '20',
  'motions de censure deposees': '20',
  "votes blancs et nuls a l'election presidentielle": '20',
  'presidentielle et legislatives : ceux qui votent toujours, ceux qui ne votent jamais':
    '20',
  // La France qui ne produit plus
  'au-dela du chomage : le halo et le sous-emploi': '5',
  'personnes dans le halo autour du chomage': '5',
  "emploi dans l'industrie manufacturiere": '15',
  'solde des echanges de biens': '18',
  'exploitations agricoles': '4',
  'emplois dans des entreprises sous controle etranger': '18',
  "defaillances d'entreprises industrielles": '15',
  // La France et l'Europe
  "budget europeen : ce que la france verse, ce qu'elle recoit": '19',
  'solde de la france avec le budget europeen': '19',
  'travailleurs detaches en france': '5',
  'brevets europeens : france et allemagne': '17',
};

/** Les thèmes d'une consultation, par leur intitulé, et leur sujet. */
const THEMES: Record<string, string> = {
  agriculture: '4',
  culture: '23',
  defense: '16',
  democratie: '20',
  economie: '1',
  education: '6',
  egalite: '2',
  emploi: '5',
  environnement: '7',
  europe: '19',
  handicap: '13',
  immigration: '9',
  industrie: '15',
  institutions: '20',
  international: '19',
  justice: '12',
  laicite: '2',
  logement: '14',
  medias: '17',
  numerique: '17',
  'outre-mer': '21',
  recherche: '17',
  retraites: '5',
  ruralite: '14',
  sante: '3',
  securite: '12',
  seniors: '13',
  sport: '23',
  transport: '10',
  transports: '10',
};

/** Le sujet d'un indicateur d'état des lieux, ou rien. */
export const indicatorTopic = (name: string | null): string | null =>
  INDICATORS[normalize(name)] ?? null;

/** Le sujet d'un thème de consultation, ou rien (« Autre sujet »). */
export const themeTopic = (label: string | null): string | null =>
  THEMES[normalize(label)] ?? null;
