# 06 · Comment les programmes sont rangés par sujet

État au 16 novembre 2026. Ce document décrit le fonctionnement réel du code
pour le cœur du problème : lire les programmes des candidats, n'en garder que
leurs propres mots, et ranger chaque chapitre dans un sujet, avec une
fiabilité mesurée.

> Principe : chaque rangement affiché sur le site est soit décidé par une
> personne, soit décidé par une machine dans un cas où sa fiabilité a été
> mesurée sur des verdicts de personnes. Un rangement incertain part « À
> trancher » ; il ne s'affiche pas tant qu'une personne ne l'a pas tranché.
> La vérification par une personne, ses cartes et sa mesure sont décrites
> dans le document 07.

## 1. Le parcours d'un programme

1. **Collecte** (chaque matin à 6 h, heure de Paris) : les sites et les PDF
   des candidats sont lus et découpés en passages, chacun avec son titre de
   chapitre, sa source et sa date. Un passage enregistré ne s'efface jamais
   (un déclencheur de la base refuse la suppression : « Une mesure ne
   s'efface pas. »).
2. **Nettoyage** : le décor des sites et les témoignages de soutiens sont
   écartés à la lecture (section 2).
3. **Vecteurs** : chaque passage est traduit en une liste de nombres qui
   résume son sens (section 4).
4. **Rangement** (chaque matin, juste après la collecte, ou à la demande
   avec le bouton « Mettre à jour » de la page Mesure) : quatre avis sont calculés, puis un
   vote décide, ou envoie le chapitre « À trancher » (section 6).
5. **Vérification** : dans l'admin, une personne valide ou refuse le
   rangement de la machine, candidat par candidat, sur un échantillon tiré
   au hasard ; un refus se reclasse ensuite dans le bon sujet (document 07).

## 2. Le nettoyage : ne garder que les mots du candidat

Un site de campagne mélange le programme et son décor. Sans nettoyage, le
décor est rangé comme une position du candidat.

### Le décor des sites

Les encadrés ajoutés par le site autour d'une page sont reconnus à leur
titre et ne sont ni affichés ni rangés : « Autres mesures », « Dans les
actualités », « À lire aussi », « Les mesures déjà annoncées », « Publics
pour lesquels… ». Fonction : `isSiteSidebar`, dans
`backend/src/domain/programme.ts`.

### Les témoignages

Deux formes sont reconnues ; les deux sont masquées à la lecture et ne sont
plus rangées.

- **Une citation signée** : « Prénom Nom, métier · Ville », éventuellement
  précédée de la citation entre guillemets qu'elle signe (Arthaud, Attal).
  Fonctions : `isTestimony`, `withoutTestimonies`.
- **Un chapitre-témoignage** : un titre « Prénom – métier, lieu » suivi d'un
  texte à la première personne (« je », « mon », « ma »…), par exemple
  « Gaëlle – Artisane d'art, Indre » chez Ruffin. Fonction :
  `isTestimonyChapter`.

### Où ces règles s'appliquent

- À la lecture d'un site : `withoutChrome`, dans
  `backend/src/adapters/programmes/web-programme-reader.ts`.
- Au rangement : `suggest-cap-labels.ts` ignore les titres vagues, le décor
  et les chapitres-témoignages.
- À l'affichage : la page d'un candidat et la page d'un sujet filtrent les
  mêmes passages, pour les programmes collectés avant ces règles.

### Le titre de la page

Un passage d'un PDF sans titre de chapitre reprend le nom du fichier : il
n'a pas de chapitre et n'est pas rangé. Sur un site, une page par mesure
(Attal) a pour titre celui de la mesure : c'est son chapitre, et il est
rangé. Jusqu'au 16 novembre 2026, la règle valait aussi pour les sites, et
49 mesures d'Attal n'avaient jamais été rangées.

### Reste à traiter

**Les faux titres des PDF.** La lecture d'un PDF prend parfois pour un titre
un morceau de mise en page : un chiffre mis en avant (« 15 années »), un mot
en capitales (« INSCRIRE »). Le passage qui suit est coupé et parfois
répété. Sur les 10 refus de Retailleau, 6 venaient de là et 2 de sommaires
(une liste de titres sans texte). À corriger : ne plus prendre pour titre un
morceau court en capitales, recoller un passage qui commence en minuscule,
retirer les passages répétés, écarter les sommaires.


Les encadrés répétés du site d'Édouard Philippe (« Famille », « Finances
publiques », exemples de questions du champ de recherche) ont des titres
ordinaires : aucune règle sur le titre ne les distingue. Leurs rangements
sont retirés, mais ils restent visibles dans la lecture de son programme.
La solution prévue est le rapprochement par empreintes (section 10).

## 3. La grille des sujets

### D'où elle vient

Les sujets sont ceux du **Comparative Agendas Project** (CAP), « Master
Codebook », version 1.1 : <https://www.comparativeagendas.net/pages/master-codebook>.
Des chercheurs de nombreux pays l'utilisent pour ranger de la même façon les
lois, les discours et les programmes ; utiliser leur grille rend les
rangements comparables et évite que l'observatoire invente ses propres
catégories.

En base : table `cap_topics`, 21 grands sujets et 213 sous-sujets. Chaque
sous-sujet a un intitulé officiel et une définition officielle, en anglais.
L'équipe a traduit les intitulés en français. Les 213 définitions ont été
traduites par un assistant le 16 novembre 2026, sans relecture humaine
(`domain/cap-definitions.ts`, champ `descriptionFrBy` à `assistant`) ; la
définition officielle en anglais s'affiche toujours à côté et fait foi.

Les numéros 11 et 22 n'existent pas : ils ont été retirés de la grille
officielle.

### Les 21 grands sujets et leurs sous-sujets

- **1 Macroéconomie** : taux d'intérêt et inflation, chômage, politique
  monétaire, budget de l'État et dette publique, fiscalité, politique
  industrielle, contrôle des prix et des salaires.
- **2 Droits civiques et libertés** : discriminations (origine, sexe et
  orientation sexuelle, âge, handicap), droit de vote, liberté d'expression
  et de religion, vie privée, mouvements contre l'État.
- **3 Santé** : réforme du système de santé, assurance maladie, industrie
  pharmaceutique, établissements de santé, organismes d'assurance santé,
  responsabilité médicale, personnels de santé, prévention, santé des
  enfants, santé mentale, soins de longue durée, prix des médicaments,
  tabac, drogues et alcool, recherche.
- **4 Agriculture** : commerce agricole, aides aux agriculteurs, sécurité des
  aliments, promotion des produits, maladies animales et végétales, pêche,
  recherche.
- **5 Travail et emploi** : sécurité au travail, formation professionnelle,
  avantages sociaux des salariés (dont les retraites), syndicats, normes du
  travail (salaire minimum, droit du travail), emploi des jeunes,
  travailleurs migrants et saisonniers.
- **6 Éducation** : enseignement supérieur, écoles primaires et
  secondaires, publics défavorisés, enseignement professionnel, éducation
  spécialisée, excellence scolaire, recherche.
- **7 Environnement** : eau potable, déchets, déchets dangereux, pollution de
  l'air, recyclage, pollutions intérieures, espèces et forêts, protection
  des terres et des eaux, recherche.
- **8 Énergie** : nucléaire, électricité, gaz et pétrole, charbon, énergies
  renouvelables, économies d'énergie, recherche.
- **9 Immigration** : un seul sous-sujet.
- **10 Transports** : transports en commun, routes, aérien, ferroviaire,
  maritime, infrastructures, recherche.
- **12 Justice et criminalité** : police et justice, délinquance financière,
  drogues illicites, tribunaux, prisons, délinquance des mineurs,
  maltraitance des enfants, droit de la famille, codes pénal et civil,
  lutte contre la délinquance.
- **13 Protection sociale** : aide aux personnes à faibles revenus, aux
  personnes âgées, aux personnes handicapées, associations et bénévolat,
  garde d'enfants.
- **14 Logement et aménagement** : développement local, urbain et rural,
  logement social, logement des personnes âgées, sans-abri, recherche.
- **15 Commerce intérieur et entreprises** : banques, marchés financiers,
  crédit, assurances, faillites, gestion des entreprises, petites
  entreprises, brevets, catastrophes naturelles, tourisme, sécurité des
  consommateurs, sport, recherche.
- **16 Défense** : alliances, renseignement, préparation des forces, armes
  nucléaires, personnels et équipements militaires, bases, réserves,
  défense civile, industrie de défense, opérations extérieures, recherche.
- **17 Sciences, technologies et communications** : espace,
  télécommunications, audiovisuel, météorologie, informatique et numérique,
  recherche.
- **18 Commerce extérieur** : accords commerciaux, exportations,
  investissements à l'étranger, compétitivité, droits de douane, taux de
  change.
- **19 Affaires internationales** : aide au développement, ressources
  internationales, finance internationale, Union européenne, relations avec
  un pays, droits humains, organisations internationales, terrorisme,
  diplomatie.
- **20 Fonctionnement de l'État** : État et collectivités, administration,
  fonction publique, nominations, achats publics, patrimoine de l'État,
  administration fiscale, relations entre les pouvoirs, élections,
  statistiques publiques, fêtes nationales.
- **21 Terres et ressources publiques** : parcs nationaux, peuples
  autochtones, terres publiques, ressources en eau, outre-mer.
- **23 Culture** : un seul sous-sujet.

### La règle de rangement

Un passage se range selon **la politique publique qu'il vise**, pas selon
ce dont il parle au sens large. C'est la pratique du CAP : le codeur
cherche le problème de politique publique principalement abordé. Pour
chaque passage, la personne qui vérifie (et le modèle) suit ces étapes :

1. **Lire le passage sans son titre.** Un titre couvre souvent plusieurs
   sujets.
2. **Trouver l'objet** : quelle politique, quelle règle ou quelle situation
   le passage veut changer ou dénonce.
3. **Séparer la cause de ses conséquences.** Un passage qui dénonce les
   restrictions de titres de séjour et décrit leurs effets (perte d'emploi,
   travail non déclaré, bas salaires) se range en 9 Immigration, pas en
   5 Travail et emploi.
4. **Prendre la catégorie la plus précise**, pas celle des mots les plus
   fréquents. Dix fois « travailleurs » ne font pas un passage Travail ; une
   mention des dépenses publiques ne fait pas un passage Macroéconomie.
5. **Signaler l'ambiguïté.** Si deux sujets sont développés à égalité, le
   passage reçoit les deux rangements, ou part en « À trancher », plutôt
   qu'un seul rangement présenté comme certain.
6. **Un dispositif à l'école se range en 6 Éducation.** Un outil
   numérique en classe, une « Classe Culture », un lycée de la mer : c'est
   l'école qui change, pas la technologie ni la culture. Cas relevés le
   16 novembre 2026 : l'IA à l'école (Attal), la Classe Culture
   (Retailleau), le lycée de la mer (Mélenchon), tous trois refusés en
   vérification.

Après un refus, la personne a trois issues en plus du bon sujet : « pas une
position du candidat » (un témoignage, un texte d'un tiers), « sans sujet
de politique publique » (sa position, mais une analyse, un appel ou un
slogan qui ne vise aucune politique : le code 000 du Manifesto Project) ;
et l'outil ferme lui-même une carte dont le texte a disparu à la relecture.
À chaque issue, la personne peut écrire pourquoi. L'explication est gardée
avec le rangement corrigé ; quand le modèle range un passage proche, il lit
les corrections les plus ressemblantes avec leur explication (« Note de
l'équipe »). Le classeur à vecteurs, lui, n'apprend que du sujet choisi, pas
de l'explication.

Les passages écartés (« sans sujet de politique publique », « pas une
position du candidat », ou « aucun sujet précis » dans À trancher) sont des
**contre-exemples** : le modèle les voit avec leur explication, et peut
répondre « 0, aucun sujet de politique publique ». Un passage dont
l'exemple le plus proche par le sens est un contre-exemple n'est jamais
rangé seul par le classeur : le modèle le lit. Quand le modèle répond
« aucun sujet », le passage part dans À trancher ; il n'est jamais écarté
sans personne. Essai du 16 novembre 2026 : sans exemple, Qwen range une
attaque contre le RN en Travail et emploi ; avec le contre-exemple de
l'équipe, il répond « aucun sujet » pour une attaque contre Mélenchon, et
range toujours « interdire les licenciements » en Travail et emploi.
Une signature (« Nathalie Arthaud, Arlette Laguiller et Jean-Pierre
Mercier. ») et un appel à soutenir la campagne ne sont plus rangés
(`isCampaignLogistics`).

Deux opérations restent distinctes : vérifier la source (le texte est-il
bien celui du candidat, bien extrait ?) et ranger (dans quel sujet ?). La
seconde comporte une part d'interprétation ; la règle ci-dessus la rend
explicable et contestable sur des critères précis.

### Les choix de l'équipe

La définition officielle ne tranche pas tous les cas. L'équipe a tranché
405 cas en écrivant sa raison (table `cap_labels`, origine « personne »,
champ `reason`). Les plus fréquents :

- **Retraites → 5 Travail et emploi**, et non 13 Protection sociale. C'est
  la définition officielle du sous-sujet 503 : « employee benefits,
  pensions, and retirement accounts ».
- **Politique industrielle et fiscalité → 1 Macroéconomie.**
- **Institutions et collectivités → 20 Fonctionnement de l'État.**
- **Intelligence artificielle** : rangée selon son usage. L'IA à l'école va
  en 6 Éducation, l'IA dans l'administration en 20 Fonctionnement de
  l'État ; seule l'IA comme technologie va en 17.
- **Passeurs et asile → 9 Immigration**, et non 19 Affaires
  internationales.
- **Allocation adulte handicapé → 13 Protection sociale**, et non
  2 Discriminations.
- **Sécurité intérieure → 12 Justice et criminalité**, et non 16 Défense.

Ces choix appliquent la règle ci-dessus à des cas fréquents. Ils ne sont
pas encore réunis dans un guide complet en français ; c'est la prochaine
étape (section 11).

## 4. Les vecteurs : comparer le sens

### Le principe

Un calcul ne travaille que sur des nombres. Le modèle **bge-m3** (licence
libre, plus de 100 langues dont le français) lit un texte et le traduit en
une liste de **1 024 nombres**, son vecteur. Il a appris sur des millions de
textes à placer au même endroit les textes de même sens : « retraite » et
« pension » sont proches, « école » et « armée » sont loin. Il tourne sur la
machine de l'équipe, par Ollama, sans envoyer les textes ailleurs.

### Les textes transformés en vecteurs

- **Chaque passage** : son titre de chapitre et son texte, limités à 2 000
  caractères.
- **Chaque chapitre (bloc)** : la moyenne des vecteurs de ses **8 premiers
  passages**. La moyenne garde la direction commune à tous les passages, le
  thème du chapitre, et atténue les détails de chacun. On s'arrête à 8
  parce que les premiers passages disent le sujet ; au-delà, un long
  chapitre dérive vers ses sous-thèmes.
- **Chaque sujet de la grille** : son intitulé français, son intitulé
  anglais et sa définition officielle, en une phrase. Soit 234 vecteurs
  (21 grands sujets et 213 sous-sujets), table `topic_vectors`.

### Mesurer la ressemblance : le cosinus

    cos(a, b) = (a · b) / (|a| × |b|)

Il mesure l'angle entre deux vecteurs, pas leur longueur. La longueur
dépend surtout de la longueur du texte ; la direction dépend du sens. Un
résultat proche de 1 veut dire « même sens », proche de 0 « aucun rapport ».

## 5. Le classeur appris

### Son calcul

Une **régression logistique à 21 classes** (fonction `trainSoftmax`, dans
`backend/src/domain/softmax.ts`).

1. **Un score par sujet.** Pour chaque sujet, le classeur a appris un poids
   par nombre du vecteur (21 × 1 024 poids) et un décalage :

       score(sujet) = décalage(sujet) + Σ poids(sujet, j) × vecteur(j)

2. **Les scores deviennent des probabilités**, par la fonction **softmax** :

       p(sujet) = e^score(sujet) / Σ e^score(chaque sujet)

   L'exponentielle rend tout positif, la division ramène le total à 100 %.
   Un sujet nettement devant les autres prend presque toute la probabilité.

La réponse n'est donc pas un sujet mais une probabilité pour chacun des 21,
par exemple : Éducation 82 %, Travail et emploi 9 %, Technologies 4 %…
La plus haute est sa **confiance**.

### Pourquoi un modèle simple

- **Peu d'exemples** : 1 380 chapitres pour 1 024 nombres. Un modèle
  complexe (un réseau de neurones) apprendrait les exemples par cœur au lieu
  de la règle : c'est le **surapprentissage**. Un modèle linéaire sépare
  l'espace par des frontières planes et résiste mieux.
- **Le travail difficile est fait par les vecteurs** : ils regroupent déjà
  les textes par sens. Il reste à tracer des frontières entre les groupes.
- **Il donne des probabilités**, donc un degré de certitude, et pas
  seulement une réponse.
- **Il est rapide** (environ 8 secondes d'apprentissage) **et lisible** :
  chaque poids peut s'examiner.

### Comment il apprend

**La quantité minimisée : l'entropie croisée.**

    perte = − log p(bon sujet)

Donner 90 % au bon sujet coûte 0,1 ; ne lui donner que 1 % coûte 4,6. Cette
mesure punit surtout les erreurs commises avec assurance : le classeur
apprend à ne pas se dire sûr à tort, et sa confiance devient
utilisable comme seuil.

**La correction des poids.** Pour chaque exemple, l'écart à corriger vaut
`p(sujet) − 1` pour le bon sujet et `p(sujet)` pour les autres : le
classeur monte le bon sujet et descend les autres, en proportion de son
erreur.

**Adam** règle la taille de chaque pas, poids par poids : un poids qui bouge
peu fait de plus grands pas, un poids qui oscille de plus petits.

**Les réglages**

- **60 passages** sur les exemples, **par paquets de 32**, **pas de 0,01** :
  valeurs classiques, assez pour converger sans coller aux exemples.
- **Pénalité L2 de 0,0001** : à chaque pas, chaque poids est un peu ramené
  vers zéro. Des poids plus petits donnent des scores moins extrêmes, donc
  moins de certitudes exagérées et moins de surapprentissage.

### Sur quoi il apprend

Il est réentraîné de zéro à chaque rangement. Tant que les verdicts de
personnes sont trop peu nombreux, il apprend sur tous les rangements
affichés. À partir de 300 rangements vérifiés par une personne, sur au
moins 4 candidats, il n'apprend plus que sur eux (`domain/calibration.ts`).
Les décisions prises par un assistant ne servent jamais d'exemple.

## 6. Le vote : quatre avis, puis une décision

Pour chaque chapitre à ranger (`suggest-cap-labels.ts`) :

### Les quatre avis

- **La grille** : le sujet dont le vecteur est le plus proche de celui du
  chapitre (cosinus), parmi les 234 vecteurs ; un sous-sujet compte pour son
  grand sujet.
- **Le classeur** : son sujet le plus probable, avec sa confiance.
- **Le titre** : le sujet le plus proche du titre du document du candidat.
- **La rubrique** : le sujet le plus proche du titre du document suivi du
  titre du chapitre.

### La décision

1. **Rangement direct, sans modèle de langue**, dans deux cas :
   - le classeur est sûr de lui au-delà du **seuil mesuré** (section 7) ;
   - ou la grille et le classeur donnent le même sujet, et le titre ou la
     rubrique le confirme.
2. **Sinon, Qwen3 tranche.** Ce modèle de langue (licence Apache 2.0) tourne
   sur la machine de l'équipe. Il reçoit la grille en français avec les
   sous-sujets, le chapitre, et comme exemples les décisions de personnes
   les plus proches par le sens, avec leur raison (jamais celles d'un
   assistant). Sa réponse est
   contrainte à la liste des codes : il ne peut rien inventer. Sa
   température est nulle : un même chapitre reçoit toujours la même réponse.
   Fichier : `backend/src/adapters/classifier/ollama-topic-classifier.ts`.
3. **Son choix est retenu seulement si au moins un autre avis donne le même
   sujet** (fonction `vote`, `backend/src/domain/vote.ts`). Le titre et la
   rubrique, qui sont le classement du candidat lui-même, ne décident jamais
   seuls : ils peuvent seulement confirmer.
4. **Sinon, le chapitre part « À trancher »**, et une personne décide.

## 7. Le seuil : quand le classeur range seul

### Comment on teste

Script : `backend/src/scripts/test-vector-classifier.ts`, ou le bouton
« Mettre à jour » de la page Mesure de l'admin.

- **La référence** : les chapitres vérifiés par une personne sur les cartes
  (document 07), jamais les décisions d'un assistant.
- **Le vrai classeur** : le test entraîne la fonction même du rangement
  (`domain/softmax.ts`), pas une copie.
- **La validation croisée en 5 parts**, **coupée par chapitre** : chaque
  chapitre est testé une fois, sans avoir servi à l'entraînement, et deux
  blocs d'un même chapitre ne sont jamais l'un à l'entraînement, l'autre au
  test.

### La règle

Le seuil retenu est le plus petit (de 0,5 à 0,95) où le classeur est juste
au moins 90 fois sur 100 **en bas de sa marge**, sur au moins 30 chapitres.
Si aucun seuil n'y arrive, le classeur ne range plus jamais seul. La mesure
ne s'enregistre qu'à partir de 4 candidats vérifiés ; le rangement suivant
l'applique (table `classifier_calibrations`, une ligne par mesure, aucune ne
s'efface).

### Les résultats (16 novembre 2026)

Sur environ 280 blocs vérifiés par une personne, 5 candidats, jamais vus à
l'entraînement :

| Le classeur range seul dès | Juste | Rangés sans Qwen |
|---|---|---|
| 0,5 | 94 % | 69 % |
| 0,6 | 96 % | 59 % |
| 0,7 | 96 % | 48 % |
| 0,8 | 99 % | 34 % |

- Justesse du classeur seul, sans seuil : **83 %**.
- **Entropie croisée : 0,71**, contre 3,04 au hasard : quand il se trompe,
  il est rarement sûr de lui.
- Seuil retenu : **0,5 ou 0,6** selon le tirage. 0,5 est juste à la limite
  des 90 % : d'une mesure à l'autre, la règle bascule. Plus de verdicts
  stabiliseront le choix.

La page Mesure de l'admin montre, pour la dernière mesure, la justesse par
sujet (rappel et précision) et les confusions les plus fréquentes.

### La marge d'erreur

    ± = 1,96 × √( p × (1 − p) / n ) × √( (N − n) / (N − 1) )

C'est l'intervalle de confiance à 95 %. Le second facteur, la correction de
population finie, rétrécit la marge quand une bonne part des N rangements
d'un candidat est vérifiée. Quand tout est juste, la formule ne vaut plus :
la règle de trois donne un taux d'erreur possible jusqu'à 3 / n.

## 8. La fiabilité en conditions réelles

Le 16 novembre 2026, une personne a vérifié sur les cartes un échantillon
tiré au hasard de 5 candidats : **274 verdicts, 94,5 % de rangements
justes**.

| Candidat | Cartes | Juste |
|---|---|---|
| Tondelier | 41 | 100 % |
| Lisnard | 41 | 100 % |
| Mélenchon | 58 | 98 % |
| Attal | 65 | 94 % |
| Retailleau | 64 | 84 % |

La plupart des refus ne sont pas des erreurs de sujet mais de découpage des
PDF (section 2, « Reste à traiter »). Sur les refus de Retailleau, 7 sur 10
étaient des décisions prises seules par l'assistant le 15 et le
16 novembre, que l'on croyait relues par une personne.

Le 15 et le 16 novembre 2026, un assistant avait pris 2 035 décisions de
rangement, enregistrées comme celles de l'équipe. Elles sont marquées
« assistant » depuis : elles ne servent ni de référence ni d'exemple.

## 9. Les limites

- **Une seule personne vérifie.** La double vérification existe (document
  07), mais tant qu'un second compte n'a pas relu, l'accord entre deux
  personnes reste non mesuré.
- **Le hasard du test** : les chapitres sont tirés au hasard ; deux mesures
  diffèrent d'un ou deux points, et le seuil peut basculer entre 0,5 et 0,6.
- **Le classeur apprend encore sur des décisions d'assistant** tant que les
  300 verdicts de personnes ne sont pas atteints.
- **Les définitions françaises ne sont pas relues** : traduites
  automatiquement, elles s'affichent avec la définition officielle en
  anglais, qui fait foi.

## 10. Le rapprochement de données (data matching)

Le **data matching** consiste à comparer des données pour retrouver celles
qui parlent de la même chose, même écrites différemment. Le rangement en
fait déjà, par le sens (vecteurs, voisins, corrections les plus proches). Il
manque le rapprochement **exact ou presque exact**, qui ne demande aucun
modèle.

### Les quatre étapes

1. **Normaliser** : minuscules, accents, ponctuation, espaces unifiés.
2. **Bloquer** (*blocking*) : ne comparer que les éléments qui peuvent correspondre, par
   exemple les pages d'un même site.
3. **Comparer** : empreinte exacte (hash), ou ressemblance approchée
   (Jaccard sur des morceaux de quelques mots, MinHash, SimHash,
   Levenshtein).
4. **Décider** : au-dessus d'un seuil, c'est la même chose ; en dessous,
   non ; entre les deux, une personne relit.

Méthode de référence pour la version probabiliste : **Fellegi-Sunter**
(outil : Splink). Termes à chercher : *data matching*, *record linkage*,
*entity resolution*, *boilerplate removal*, *template detection*.

### Les usages prévus

- **Le décor répété** : un bloc présent à l'identique sur plus de 30 % des
  pages d'un même site est du décor, retiré sans règle par candidat. Règle
  les encadrés de Philippe et ceux de tout futur site construit pareil.
- **Les mesures en double** : une même proposition sur le site, dans le PDF
  et dans un entretien n'apparaît qu'une fois.
- **Un avis de plus au vote** : le sujet des chapitres validés les plus
  ressemblants (plus proches voisins sur TF-IDF), sans modèle.
- **Le Parlement** : relier un texte de l'Assemblée à la mesure d'un
  candidat qui en parle.

## 10 bis. L'unité rangée : le chapitre ou le passage

Aujourd'hui, on range **par chapitre** : le titre et ses passages reçoivent
un seul sujet. Cela suppose un programme écrit « un titre, une mesure ». Un
texte suivi ne s'y prête pas : la brochure de 36 pages d'Arthaud (52
passages, 7 chapitres) ne donne que 3 rangements, alors qu'un seul de ses
chapitres parle de prix, de salaires, de chômage et de licenciements. Un
candidat qui écrit en prose est alors presque absent des sujets du site.

La pratique de référence range plus finement. Le Comparative Agendas
Project code les programmes de partis à la main, au niveau le plus fin, la
quasi-phrase ; le Manifesto Project aussi, avec les mêmes règles de
découpage : une quasi-phrase porte un seul message et se comprend seule.

Décision à prendre : ranger **par passage** (un paragraphe, l'unité déjà
citée) les chapitres longs dont les passages changent de sujet, et garder le
chapitre pour un titre suivi de sa mesure. À mesurer d'abord : combien de
chapitres sont concernés, candidat par candidat.

Sources :
[jeux de données CAP, programmes de partis](https://www.comparativeagendas.net/project/belgium/datasets),
[consignes de codage du Manifesto Project (Volkens, 2002)](https://ssoar.info/ssoar/bitstream/document/12512/1/ssoar-2002-volkens-manifesto_coding_instructions.pdf),
[règles communes CAP et Manifesto Project](https://informahealthcare.com/doi/full/10.1080/13597566.2016.1141767).

### Les chapitres découpés, pour tous les candidats (16 novembre 2026)

Deux formes de chapitre se rangent passage par passage, quel que soit le
candidat :

- **Les propositions numérotées** : au moins deux passages, et au moins la
  moitié, commencent par « Proposition 8 - », « Mesure 3 : » ou « 12. »
  (`isEnumeratedChapter`). 7 chapitres : 6 chez Retailleau, 1 chez
  Dupont-Aignan.
- **Les listes de mesures qui changent de sujet** : au moins trois passages,
  dont six sur dix commencent par un infinitif (« Stopper », « Renforcer »),
  et dont les mesures que le classeur range avec au moins 50 % de confiance
  relèvent d'au moins deux sujets, le plus fréquent en couvrant moins de
  sept sur dix (`isMeasureList`, `spansSeveralTopics`). Sur 323 listes,
  54 changent de sujet (676 mesures) : Dupont-Aignan 17, Mélenchon 14,
  Tondelier 10, Retailleau 4, Philippot 3, Glucksmann 3, Ruffin 2,
  Attal 1. Les 269 autres restent d'un bloc.

**Un chapitre dont un rangement a été validé par une personne n'est jamais
découpé** : sa décision prime, y compris quand elle a donné plusieurs
sujets au même chapitre. Pour les autres, le rangement d'un bloc est
retiré par l'outil, avec sa raison, et un refus qui attendait son
reclassement est fermé. Un chapitre découpé le reste aux rangements
suivants. (Un premier essai, le 16 novembre, restreignait les rangements
validés aux seules mesures de leur sujet : 19 rangements validés avaient
été réduits ; ils ont été rétablis avant que rien ne soit rangé à
nouveau.)

## 11. Prochaines étapes

1. **Corriger le découpage des PDF** (section 2) : la première source de
   refus.
2. **Vérifier les autres candidats**, pour atteindre 300 verdicts sur au
   moins 4 candidats et faire apprendre le classeur sur eux seuls.
3. **Un second compte** pour la double vérification et la mesure de
   l'accord entre deux personnes (kappa de Cohen).
4. **Un guide de rangement en français** à partir des raisons données en
   vérification et des confusions mesurées.
5. **Le rapprochement par empreintes** pour le décor répété (section 10).

## Fichiers

- Nettoyage : `backend/src/domain/programme.ts`,
  `backend/src/adapters/programmes/web-programme-reader.ts`.
- Rangement : `backend/src/features/subjects/suggest-cap-labels/suggest-cap-labels.ts` ;
  chaque matin : `backend/src/jobs/daily-collection.ts`.
- Vecteurs et contexte du vote : `backend/src/common/subject-vectors.ts`.
- Vote, cosinus, moyenne : `backend/src/domain/vote.ts`.
- Classeur appris et entropie croisée : `backend/src/domain/softmax.ts`.
- Seuil et apprentissage sur les verdicts : `backend/src/domain/calibration.ts`.
- Modèle de langue : `backend/src/adapters/classifier/ollama-topic-classifier.ts`.
- Test et seuil : `backend/src/scripts/test-vector-classifier.ts`.
- Grille : `backend/src/scripts/import-cap.ts`, table `cap_topics` ;
  définitions françaises : `backend/src/domain/cap-definitions.ts` ;
  vecteurs de la grille : `backend/src/scripts/embed-passages.ts`, table
  `topic_vectors`.
