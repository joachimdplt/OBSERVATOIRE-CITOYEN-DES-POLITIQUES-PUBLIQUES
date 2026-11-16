# 07 · Feuille d'opération : la vérification du rangement

État au 16 novembre 2026. Fonctionnalité à construire. Elle a deux buts :
rendre la base, les documents et le site cohérents entre eux sur ce qui a
été vérifié, puis mesurer la fiabilité du rangement avec une référence
réellement humaine, candidat par candidat et couche par couche.

> Règle de cohérence : un mot dit sur une décision (« relu », « validé »,
> « tranché par l'équipe ») doit être vrai dans la base, et une décision
> enregistrée en base doit dire qui l'a prise, une personne ou un
> assistant.

## 0. Où en est la fonctionnalité (16 novembre 2026)

| Élément | État |
|---|---|
| Lot 0 : `decisionMode` en base, 2 035 décisions requalifiées `assistant` | fait (migration `label_checks`) |
| Lot 0 : exemples de Qwen et référence du test limités aux décisions `person` | fait ; le test refuse de tourner sous 50 blocs |
| Lot 0 : le classeur garde sa confiance dans les voix (`proposals`, champ `p`) | fait, pour les rangements faits désormais |
| Lot 0 : l'apprentissage du classeur | bascule seul sur les verdicts de personnes à partir de 300, sur au moins 4 candidats (`domain/calibration.ts`) |
| Lot 0 : le seuil du classeur sûr de lui | mesuré par `test-vector-classifier.ts` sur les verdicts de personnes, enregistré dans `classifier_calibrations` ; 0,7 par défaut tant qu'aucune mesure n'existe |
| Lot 1 : textes du 06 et page Sources | à faire |
| Lot 2 : cartes plein écran, valider ou refuser | fait : admin, menu « Vérification » |
| Lot 2 : ranger ailleurs un chapitre refusé | seconde couche, à faire |
| Lot 3 : taux par candidat, marge à 95 % | fait, dans l'admin et dans `tools/measure` |

### Les cartes

Une carte montre le chapitre du candidat mot pour mot, puis le sujet donné
par la machine. Deux gestes : **Refuser** (flèche gauche) ou **Valider**
(flèche droite). Échap ramène à la liste. Refuser veut dire : le sujet est
faux, ou le texte n'est pas une position du candidat.

Un verdict est une ligne de `label_checks`, qui ne se modifie ni ne
s'efface (déclencheur en base). Il passe le rangement en `validated` ou
`rejected`, signé `person`. Le tirage est au hasard mais stable : la même
carte revient à la même place d'une visite à l'autre.

### Combien de cartes

Pour une marge de ± 10 points à 95 % : 97 cartes sur une grande
population, moins pour un petit candidat (correction de population finie).
Soit 645 cartes pour les 21 candidats qui ont des rangements, de 3 (Roussel)
à 68 (Dupont-Aignan). Fonction : `sampleSize`, dans
`backend/src/domain/sampling.ts`.

### L'outil de mesure

    cd backend && npm run measure         vos verdicts
    cd backend && npm run measure:demo    essai sur les décisions de l'assistant

Il donne le taux par candidat, la fiabilité de chaque voix du vote, la
calibration du classeur, et l'entropie croisée d'un classeur réentraîné sur
les seuls verdicts, en validation croisée par chapitre. `--demo` à l'export
prend les décisions de l'assistant pour essayer l'outil : la mesure est
alors circulaire.

### Le seuil mesuré

`npx tsx src/scripts/test-vector-classifier.ts` teste le classeur en
validation croisée sur les chapitres vérifiés par une personne, puis
enregistre le plus petit seuil (0,5 à 0,95) où il est juste au moins 90 fois
sur 100 en bas de sa marge, sur au moins 30 chapitres. Sans seuil assez
juste, le classeur ne range plus jamais seul. La mesure n'est enregistrée
qu'à partir de 4 candidats vérifiés. `--dry` affiche sans enregistrer.

Premier essai, 16 novembre 2026, 57 chapitres de Mélenchon : 26 justes sur
26 au-dessus de 0,6, marge basse 88 %, donc aucun seuil retenu, et mesure
non enregistrée (un seul candidat).

### Limite connue

Une décision prise par l'écran de relecture ou par les cartes est
enregistrée `person`. Un script qui appellerait ces routes avec une session
de l'équipe serait pris pour une personne : la règle est de ne jamais le
faire.

## 1. Le constat

Le document 06 affirme que l'équipe a relu les rangements et que la
fiabilité est mesurée. La base dit autre chose.

| Le document 06 dit | La base montre (`cap_labels`) |
|---|---|
| « 1 208 rangements relus un par un » | 1 303 décisions datées de la même minute (16 nov., 9 h 39) |
| « L'équipe a tranché 405 cas en écrivant sa raison » | 510 décisions datées de la même minute (15 nov., 21 h 13) |
| Origine « personne » pour 405 cas | Les 2 035 décisions portent la signature d'un seul compte ; elles ont été prises par un assistant |

État des étiquettes au 16 novembre :

| Origine | Statut | Nombre |
|---|---|---|
| model | validated | 1 059 |
| model | rejected | 571 |
| person | validated | 401 |
| person | rejected | 4 |

Conséquences :

1. **La mesure est circulaire.** Les taux de 89 %, 91 %, 96 % et 98 % du
   document 06 comparent une machine à un assistant, et non à une personne.
   Le seuil de 70 % repose sur cette référence et n'est donc pas justifié.
2. **L'apprentissage est circulaire.** `suggest-cap-labels.ts` (lignes 173
   et 307) donne à Qwen, comme exemples de « corrections de l'équipe », les
   étiquettes `origin = person, status = validated`. Ce sont les décisions de
   l'assistant. Le classeur appris s'entraîne aussi dessus.
3. **Le site affirme une vérification qui n'a pas eu lieu.** Le statut
   `validated` signifie « confirmé par une personne » (`schema.prisma`).
4. **La mesure par candidat n'existe pas.** Un même taux global cache des
   problèmes différents d'un candidat à l'autre (tableau section 6).

## 2. Le principe de la fonctionnalité

- Chaque décision enregistre son **mode** : `person` (une personne, dans
  l'admin, une décision à la fois) ou `assistant` (un script ou un
  assistant, même lancé depuis un compte de l'équipe).
- Seule une décision `person` sert de référence au test, d'exemple à Qwen et
  de vérité au classeur.
- L'audit se fait **à l'aveugle** : la personne range le chapitre avant de
  voir la réponse de la machine.
- Une couche est auditée avant la suivante, car une erreur en bas fausse
  tout ce qui est au-dessus.
- Rien ne s'efface : la requalification des décisions passées crée une
  version, conformément à la procédure de rectification.

## 3. Les couches

| N° | Couche | Question posée sur un tirage | Unité tirée |
|---|---|---|---|
| 1 | Collecte | Ce document est-il bien du candidat, complet, daté ? | document |
| 2 | Nettoyage | Ce passage gardé est-il bien un mot du candidat ? Ce passage écarté est-il bien du décor ? | passage |
| 3 | Grille | Dans quel sujet la personne range-t-elle ce chapitre (sans voir la machine) ? | chapitre |
| 4 | Vecteurs | Les 5 chapitres les plus proches parlent-ils du même sujet ? | chapitre |
| 5 | Classeur | Sa réponse est-elle juste, et à quelle confiance ? | chapitre (tiré de la couche 3) |
| 6 | Vote | Le vote a-t-il retenu le bon avis ? | chapitre (tiré de la couche 3) |

Les couches 5 et 6 ne demandent pas de nouveau travail humain : elles se
calculent en comparant la réponse de la machine aux réponses données en
couche 3.

## 4. Les lots

### Lot 0 · Remettre la base en cohérence

1. Ajouter à `cap_labels` le champ `decisionMode` (`person` | `assistant`),
   vide pour une étiquette non décidée.
2. Requalifier en `assistant` les 2 035 décisions existantes, par migration,
   avec une raison écrite dans la migration (« décidé par un assistant le
   15 et le 16 novembre 2026, sans relecture humaine »).
3. Toute décision prise par l'écran de relecture de l'admin s'enregistre en
   `person`. Toute décision écrite par un script s'enregistre en
   `assistant`. Aucun script ne peut écrire `person`.
4. `suggest-cap-labels.ts`, `vote-cap-labels.ts` et
   `test-vector-classifier.ts` ne lisent comme référence et comme exemples
   que les décisions `person`.

Critères d'acceptation :

- `select "decisionMode", count(*) from cap_labels group by 1` ne montre
  aucune décision `person` avant le premier audit.
- Un test vérifie qu'un script ne peut pas enregistrer une décision `person`.
- Le test de fiabilité refuse de tourner, avec un message clair, tant qu'il
  y a moins de 50 chapitres décidés en `person`.

### Lot 1 · Remettre les textes en cohérence

1. Document 06 : retirer « relus un par un », « l'équipe a tranché », les
   taux des sections 7 et 8 présentés comme mesurés. Les remplacer par :
   « fiabilité non mesurée ; mesure en cours, voir le document 07 ».
2. Page Sources du site : même correction (elle dit aussi encore que Qwen
   range chaque chapitre seul).
3. Page d'un sujet et page d'un candidat : la mention de provenance d'un
   rangement dit « rangé automatiquement, non vérifié » quand aucune
   décision `person` ne le confirme (voir la décision D1).

Critère d'acceptation : aucune phrase du site ni des documents ne parle de
relecture humaine sans une décision `person` correspondante en base.

### Lot 2 · L'écran d'audit dans l'admin

Une page `admin/src/routes/_admin/audit.tsx`, dans le design monochrome.

1. La personne choisit un candidat et une couche.
2. L'écran tire 20 éléments au hasard, avec une graine enregistrée pour
   que le tirage puisse être rejoué.
3. Pour chaque élément : le texte exact, sa source et son lien, puis la
   question de la couche. La réponse de la machine reste cachée jusqu'à la
   réponse de la personne.
4. Réponses possibles : « juste », « faux » (avec le bon sujet ou la bonne
   catégorie), « je ne sais pas ». Une raison en une phrase est demandée
   pour « faux ».
5. Après la réponse, l'écran montre la réponse de la machine, pour
   apprendre, sans permettre de modifier la réponse déjà donnée.

Stockage : une table `audit_checks` (candidat, couche, élément, graine,
réponse de la personne, réponse de la machine au moment du tirage, auteur,
date). Une réponse ne se modifie pas ; une correction crée une nouvelle
ligne.

En couche 3, une réponse « juste » ou « faux » crée aussi l'étiquette
`person` correspondante dans `cap_labels`, ce qui alimente la référence du
lot 0.

### Lot 3 · Les taux par candidat et par couche

Sur la même page, un tableau : une ligne par candidat, une colonne par
couche, avec dans chaque case le nombre de tirages, le taux juste et sa
marge à 95 % (formule du document 06, section 7 ; règle de trois quand le
taux est de 0 % ou de 100 %).

Une case reste « non mesuré » tant qu'elle compte moins de 20 tirages,
jamais « 0 % ».

Le seuil du classeur (70 % aujourd'hui) se recalcule sur les seules
décisions `person` (lot 0, point 4) et s'écrit avec sa date et son nombre
de chapitres.

## 5. L'ordre de passage des candidats

1. **Delphine Batho** (79 passages, 21 décisions) : petit, pour apprendre
   la méthode de bout en bout, les six couches en une séance.
2. **Édouard Philippe** (409 passages, 132 retraits sur 344 décisions) : le
   problème est isolé, il est dans le nettoyage (couche 2).
3. **Marine Tondelier** (6 005 passages, 69 rangements) : vérifier en
   couches 1 et 2 pourquoi si peu de chapitres sont rangés.
4. Les autres candidats qui ont un programme, par ordre décroissant de
   rangements affichés : Dupont-Aignan, Ruffin, Retailleau, Attal,
   Mélenchon, puis les autres.
5. Lalanne, Riner, Platret, Durif : pas de programme, couche 1 seulement
   (vérifier qu'il n'existe vraiment rien à collecter).

Un candidat est « audité » quand ses couches 1 à 3 comptent chacune au
moins 20 tirages.

## 6. Le point de départ par candidat

| Candidat | Programme | Documents | Passages | Rangés | Retirés |
|---|---|---|---|---|---|
| Bruno Retailleau | complet | 34 | 6 056 | 182 | 52 |
| Marine Tondelier | complet | 8 | 6 005 | 69 | 17 |
| Gabriel Attal | partiel | 209 | 3 053 | 156 | 82 |
| Raphaël Glucksmann | partiel | 6 | 2 177 | 27 | 10 |
| Nicolas Dupont-Aignan | partiel | 34 | 1 544 | 225 | 68 |
| François Ruffin | partiel | 9 | 1 385 | 198 | 71 |
| Jean-Luc Mélenchon | complet | 31 | 1 189 | 129 | 27 |
| Florian Philippot | partiel | 6 | 1 092 | 23 | 5 |
| Marine Le Pen | partiel | 6 | 776 | 49 | 21 |
| Édouard Philippe | complet | 16 | 409 | 212 | 132 |
| Karim Bouamrane | partiel | 1 | 385 | 12 | 7 |
| David Lisnard | partiel | 12 | 327 | 70 | 26 |
| Natacha Polony | partiel | 4 | 212 | 13 | 14 |
| Nathalie Arthaud | partiel | 6 | 192 | 11 | 16 |
| Anasse Kazib | partiel | 7 | 184 | 15 | 11 |
| Delphine Batho | partiel | 5 | 79 | 16 | 5 |
| Selma Labib | partiel | 1 | 61 | 13 | 0 |
| Olivier Becht | partiel | 6 | 34 | 25 | 3 |
| Fabien Roussel | partiel | 1 | 13 | 3 | 4 |
| Xavier Bertrand | partiel | 1 | 10 | 4 | 4 |
| Éric Zemmour | partiel | 1 | 6 | 8 | 0 |
| Francis Lalanne | aucun | 0 | 0 | 0 | 0 |
| Teddy Riner | aucun | 0 | 0 | 0 | 0 |
| Gilles Platret | aucun | 0 | 0 | 0 | 0 |
| Sylvain Durif | aucun | 0 | 0 | 0 | 0 |

« Rangés » et « Retirés » comptent des décisions prises par un assistant ;
aucune n'est encore vérifiée.

## 7. Ce qu'il faut apprendre, couche par couche

| Couche | Notion | Ce qu'il faut en retenir ici |
|---|---|---|
| 2 | Précision et rappel | Garder un témoignage est une erreur de précision ; écarter un vrai passage est une erreur de rappel. Les deux se mesurent séparément. |
| 3 | Accord entre codeurs, kappa de Cohen | Une personne aussi se trompe ; le CAP mesure l'accord entre deux codeurs avant de parler de vérité. |
| 4 | Plongements (embeddings), cosinus | Proche en sens ne veut pas dire même sujet de la grille. |
| 5 | Régression logistique, softmax, entropie croisée | La perte vaut − log p(bon sujet) ; elle punit les erreurs commises avec assurance. |
| 5 | Calibration | La question utile : « sûr à 70 % » veut-il dire « juste 7 fois sur 10 » ? Se vérifie avec les tirages de la couche 3. |
| Toutes | Intervalle de confiance, règle de trois | 20 tirages donnent une marge d'environ ± 20 points : un ordre de grandeur, pas une preuve. |

## 8. Décisions à prendre

- **D1. Que montre le site en attendant l'audit ?** Soit les rangements
  restent affichés avec la mention « rangé automatiquement, non vérifié »,
  soit ils sont masqués jusqu'à l'audit du candidat. Le principe actuel du
  document 06 (« une machine seulement si sa fiabilité est mesurée ») mène
  au masquage. Recommandation : la mention, qui se retire sans perte, et
  la modification du principe du 06 pour qu'il dise la même chose.
- **D2. Une seconde personne pour le kappa.** Sans elle, la référence reste
  une seule personne (limite déjà notée au document 06, section 9).

## 9. Hors périmètre

- Le rapprochement par empreintes du décor répété (document 06, section 10) :
  il vient après l'audit de Philippe en couche 2, qui en donnera la mesure
  de départ.
- Le guide de rangement en français : il s'écrit à partir des raisons
  données en audit, donc après le lot 2.

## 10. Fichiers touchés

- Lot 0 : `backend/prisma/schema.prisma` et une migration ;
  `backend/src/features/subjects/review-cap-labels/review-cap-labels.ts` ;
  `backend/src/features/subjects/suggest-cap-labels/suggest-cap-labels.ts` ;
  `backend/src/features/subjects/vote-cap-labels/vote-cap-labels.ts` ;
  `backend/src/scripts/test-vector-classifier.ts`.
- Lot 1 : `docs/06-rangement.md` ; la page Sources et les pages sujet et
  candidat de `site/`.
- Lot 2 et 3 : une fonctionnalité `backend/src/features/audit/` ;
  `admin/src/routes/_admin/audit.tsx` et ses composants.
