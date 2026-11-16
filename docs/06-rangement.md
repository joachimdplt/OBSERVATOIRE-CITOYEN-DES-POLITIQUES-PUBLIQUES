# 06 · Comment les programmes sont rangés par sujet

État au 16 novembre 2026. Ce document décrit le fonctionnement réel du code
pour le cœur du problème : lire les programmes des candidats, n'en garder que
leurs propres mots, et ranger chaque chapitre dans un sujet, avec une
fiabilité mesurée.

> Principe : chaque rangement affiché sur le site est soit décidé par une
> personne, soit décidé par une machine dans un cas où sa fiabilité a été
> mesurée au moins égale à l'autre voie. Un rangement incertain part en
> relecture ; il ne s'affiche pas tant qu'une personne ne l'a pas tranché.

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
4. **Rangement** : quatre avis sont calculés, puis un vote décide, ou envoie
   le chapitre en relecture (section 6).
5. **Relecture** : dans l'admin, l'équipe valide, corrige ou retire. Seuls
   les rangements validés s'affichent sur le site.

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

### Reste à traiter

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

Ces choix ne sont pas encore réunis dans un guide de rangement en français ;
c'est la prochaine étape (section 11).

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

Sur tous les rangements affichés (validés par l'équipe, ou rangés par le
vote), à chaque lancement du rangement. Chaque relecture de l'équipe
l'améliore donc au lancement suivant.

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
   - le classeur est sûr à **70 % ou plus** (section 7) ;
   - ou la grille et le classeur donnent le même sujet, et le titre ou la
     rubrique le confirme.
2. **Sinon, Qwen3 tranche.** Ce modèle de langue (licence Apache 2.0) tourne
   sur la machine de l'équipe. Il reçoit la grille en français avec les
   sous-sujets, le chapitre, et comme exemples les corrections de l'équipe
   les plus proches par le sens, avec leur raison. Sa réponse est
   contrainte à la liste des codes : il ne peut rien inventer. Sa
   température est nulle : un même chapitre reçoit toujours la même réponse.
   Fichier : `backend/src/adapters/classifier/ollama-topic-classifier.ts`.
3. **Son choix est retenu seulement si au moins un autre avis donne le même
   sujet** (fonction `vote`, `backend/src/domain/vote.ts`). Le titre et la
   rubrique, qui sont le classement du candidat lui-même, ne décident jamais
   seuls : ils peuvent seulement confirmer.
4. **Sinon, le chapitre part en relecture**, et une personne décide.

## 7. Le seuil de 70 % : un compromis mesuré

### Comment on teste

Script : `backend/src/scripts/test-vector-classifier.ts`.

- **La référence** : des chapitres relus par l'équipe. Leur rangement est
  tenu pour la bonne réponse ; on la cache au classeur et on compare.
- **La validation croisée en 5 parts** : on entraîne sur tout sauf une part,
  on teste sur cette part, et on recommence 5 fois. Chaque chapitre est
  testé une fois, sans avoir servi à l'entraînement.
- **On coupe par chapitre** : deux blocs d'un même chapitre se ressemblent
  beaucoup. Si l'un servait à l'entraînement et l'autre au test, le
  classeur reconnaîtrait le chapitre et le test serait faussé.

### Les résultats (16 novembre 2026)

Entraînement sur 1 380 chapitres, test sur 150 chapitres relus.

- Confiance ≥ 50 % : juste 89 fois sur 100 (±6), 61 % des chapitres rangés
  sans Qwen.
- Confiance ≥ 60 % : 94 % (±6), 46 % des chapitres.
- **Confiance ≥ 70 % : 96 % (±5), 37 % des chapitres.**
- Confiance ≥ 80 % : 34 justes sur 34, 23 % des chapitres.
- Confiance ≥ 90 % : 12 justes sur 12, 8 % des chapitres.

Autres mesures du même test :

- le classeur seul, sans seuil : 79 % (±7) ;
- quand le classeur et Qwen sont d'accord : 98 % (±2), pour 74 % des
  chapitres.

### Le compromis

Plus le seuil est haut, plus le classeur a raison, mais moins il range de
chapitres seul ; il faut alors appeler Qwen, qui est lent.

**La règle** : un rangement automatique doit être au moins aussi fiable que
l'autre voie, Qwen confirmé par un autre avis, mesuré juste 91 fois sur 100.

- À 60 %, le classeur fait 94 %, mais le bas de sa marge (88 %) passe sous
  cette barre.
- **À 70 %, il fait 96 %, et le bas de sa marge reste à 91 %.**
- À 80 %, on perd encore un tiers des chapitres rangés seuls, pour un gain
  que le test ne permet pas de prouver (voir les limites).

### La marge d'erreur

    ± = 1,96 × √( p × (1 − p) / n )

C'est l'intervalle de confiance à 95 % : « 96 % ± 5 » veut dire que le vrai
taux est entre 91 et 100 %, avec 95 chances sur 100. Plus le nombre de
chapitres testés (n) est grand, plus la marge est petite.

## 8. La fiabilité en conditions réelles

Le 16 novembre 2026, les 1 208 rangements automatiques en attente ont été
relus un par un :

- **995 justes** : confirmés ;
- **95 dans le mauvais sujet** : corrigés ;
- **118 qui n'étaient pas des positions du candidat** : retirés (menus,
  appels aux dons, remerciements, glossaires, témoignages).

Sur les vrais passages de programme, 995 justes sur 1 090, soit **91 %** :
la mesure du test est confirmée. Les 118 retraits ne sont pas des erreurs de
rangement mais de nettoyage.

Corrections les plus fréquentes : retraites rangées en Protection sociale au
lieu de Travail et emploi ; intelligence artificielle rangée en
Technologies au lieu de son usage (Éducation, Fonctionnement de l'État).

Après cette relecture : 1 460 rangements validés, aucun en attente.

Chaque décision est gardée en base, dans `cap_labels`, avec son statut et,
pour une correction ou un retrait, sa raison.

## 9. Les limites

- **« 100 % » n'est pas une preuve.** 34 justes sur 34 restent compatibles
  avec un vrai taux d'erreur allant jusqu'à 9 % (règle de trois : 3 / n).
  La formule de la marge ne vaut pas pour 0 % ou 100 %.
- **Le test est petit** : 150 chapitres. Les 1 208 rangements relus le
  16 novembre n'y sont pas encore.
- **Un peu de hasard** : les exemples sont mélangés au hasard avant chaque
  passage ; deux apprentissages donnent des chiffres qui diffèrent d'un ou
  deux points.
- **Une seule référence** : l'équipe. Une erreur systématique de l'équipe
  sur un type de passage serait invisible au test.
- **La précision de Qwen est flatteuse** dans ce test : les chapitres relus
  qu'il avait bien rangés y sont majoritaires.
- **Les définitions françaises ne sont pas relues** : traduites par un
  assistant, elles s'affichent dans l'admin, pas encore sur le site ; le
  lecteur du site ne sait pas encore où finit un sujet et où commence le
  suivant.

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

## 11. Prochaines étapes

1. **Un guide de rangement en français** : pour chacun des 21 sujets, une
   définition, les sous-sujets avec leur définition traduite, les cas qui y entrent et
   ceux qui n'y entrent pas, les choix de l'équipe, deux ou trois exemples réels.
   Affiché sur le site, utilisé en relecture, donné au classeur.
2. **Le rapprochement par empreintes** pour le décor répété (section 10).
3. **Une nouvelle mesure** avec les 1 208 rangements relus dans le jeu de
   test : marges d'environ ±2 points.
4. **Une seconde relecture indépendante** de 100 à 200 chapitres, pour
   mesurer l'accord entre deux personnes (kappa de Cohen), comme le font les
   chercheurs du CAP. Elle dit jusqu'où un humain lui-même est fiable.
5. **La page Sources du site** à mettre à jour : elle dit encore que Qwen
   range chaque chapitre seul.

## Fichiers

- Nettoyage : `backend/src/domain/programme.ts`,
  `backend/src/adapters/programmes/web-programme-reader.ts`.
- Rangement : `backend/src/features/subjects/suggest-cap-labels/suggest-cap-labels.ts`.
- Vecteurs et contexte du vote :
  `backend/src/features/subjects/vote-cap-labels/vote-cap-labels.ts`.
- Vote, cosinus, moyenne : `backend/src/domain/vote.ts`.
- Classeur appris : `backend/src/domain/softmax.ts`.
- Modèle de langue : `backend/src/adapters/classifier/ollama-topic-classifier.ts`.
- Test : `backend/src/scripts/test-vector-classifier.ts`.
- Grille : `backend/src/scripts/import-cap.ts`, table `cap_topics` ;
  vecteurs de la grille : `backend/src/scripts/embed-passages.ts`, table
  `topic_vectors`.
