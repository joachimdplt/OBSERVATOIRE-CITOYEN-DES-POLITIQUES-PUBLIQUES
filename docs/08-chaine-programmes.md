# 08. La chaîne des programmes : état des lieux et architecture cible

Document d'architecture, sans code. Il décrit comment un programme passe
aujourd'hui de sa publication à la page publique, les défauts constatés
(avec leurs preuves), puis la chaîne visée et l'ordre pour y arriver.
Établi le 16 novembre 2026.

Principe directeur : **une seule chaîne pour tous les candidats.** La
méthode appliquée à un document dépend de la forme mesurée de ce document,
jamais du nom du candidat. Chaque choix de méthode est enregistré avec sa
raison, comme toute autre valeur (provenance).

---

## 1. La chaîne aujourd'hui

| Étage | Fichiers | Rôle |
|---|---|---|
| Collecte | `features/programmes/collect-programmes` | Lit chaque source, compare l'empreinte (sha256) du texte, crée une version si le texte a changé, rétablit une version déjà lue si le texte y revient. |
| Lecture | port `ProgrammeReader`, adaptateur `adapters/programmes/web-programme-reader.ts`, `domain/pdf-layout.ts` | Un seul adaptateur pour les sites et les PDF. Produit des passages (`measures` : titre, citation, page, rang). |
| Nettoyage | `domain/programme.ts`, `domain/filing-unit.ts`, `domain/cap.ts` | Des fonctions de reconnaissance de forme : décor, témoignages, boutons, logistique, titres vagues. |
| Découpage | dans `suggest-cap-labels.ts` | Reconstruit les chapitres à chaque rangement à partir du titre des passages ; découpe les longs chapitres en blocs ; passage par passage pour les candidats de `PASSAGE_FILING`. |
| Rangement | `suggest-cap-labels.ts`, port `TopicClassifier` (Qwen via Ollama), classeur softmax, vote | Propose un sujet CAP par unité. |
| Vérification | `check-cap-labels`, `review-cap-labels`, `vote-cap-labels` | Cartes, verdicts, reclassement, À trancher. |
| Mesure | `measure-report`, `tools/measure` | Fiabilité, seuil, rapport. |
| Affichage | `features/public/*` | Relit les passages et les rangements, refiltre, dédoublonne, publie. |

Volumes au 16 novembre 2026 : 424 documents de programme en vigueur,
28 449 passages en base (toutes versions), 1 912 unités à ranger, environ
2 300 rangements.

---

## 2. Constats

### C1. Le nettoyage est fait à trois étages, pas une fois

La même règle est rejouée à la lecture, au rangement et à l'affichage,
parce que les passages lus avant chaque règle restent en base.

| Règle | Lecture | Rangement | Affichage |
|---|---|---|---|
| Décor des sites (`isSiteSidebar`) | oui | oui | oui (page programme) |
| Témoignages (`withoutTestimonies`) | oui | oui | oui (3 routes) |
| Chapitre-témoignage (`isTestimonyChapter`) | non | oui | oui |
| Boutons (`isInterfaceLabel`) | oui | non | non |
| Titres vagues (`isVagueHeading`) | non | oui | non |
| Logistique de campagne (`isCampaignLogistics`) | non | oui (passages seulement) | non |
| En-têtes, pieds, légendes de PDF | oui | non | non |

Conséquences : une règle ajoutée à un étage n'existe pas aux autres ; le
public et le rangement ne voient pas toujours les mêmes passages ; un
passage écarté l'est en silence, sans raison enregistrée.

### C2. Aucune normalisation commune

Six fichiers normalisent le texte chacun à leur façon (accents,
minuscules, espaces) : `pdf-layout.ts`, `corrections.ts`,
`table-of-contents.ts`, `search-name.ts`, `approach-topics.ts`,
`site-map.ts`. Deux textes égaux pour l'un peuvent être différents pour
l'autre.

### C3. Une exception par nom

`PASSAGE_FILING = {'nathalie-arthaud'}` (`domain/filing-unit.ts`) : une
candidate est découpée passage par passage parce qu'elle est nommée, pas
parce qu'un critère mesuré le dit. C'est la seule exception par nom du
code, mais elle contredit l'égalité de traitement (CONVENTIONS, 1.8).

### C4. Le chapitre n'est pas un objet

Le chapitre est reconstruit à chaque rangement à partir du texte du titre
des passages. Un rangement est rattaché à ce texte
(`candidateId, documentUrl, heading, capCode, unit`). Quand une relecture
corrige un titre, le rangement perd son chapitre : 7 rangements orphelins
retirés le 16 novembre, dont « Les mesures déjà annoncéesFrontières »
(deux titres collés). Rien ne relie l'ancien chapitre au nouveau.

### C5. La version en vigueur est recalculée partout (corrigé en partie)

**Corrigé le 16 novembre 2026** : le choix se fait dans une seule fonction,
`liveProgrammes` (`backend/src/common/live-programmes.ts`), que les 14
endroits appellent. Reste la cible : marquer la version en vigueur à la
collecte, pour ne plus la recalculer à chaque lecture.


`currentCaptures` est appelée dans 15 fichiers. Chaque route refait le
même choix de version ; une erreur de choix (le cas de Polony, corrigé)
touche toutes les pages à la fois, et chaque nouvelle route doit penser à
l'appeler.

### C6. Les doublons : exacts seulement, à l'affichage seulement

Une citation identique n'est affichée qu'une fois (`subject-chapters.ts`,
`get-candidate-subjects`). Mais le rangement voit chaque copie : une même
phrase dans la brochure et le dépliant d'Arthaud fait deux cartes et peut
recevoir deux sujets. Une virgule ou une coupure de ligne différente suffit
à faire deux textes. Rien ne compare les documents d'un même candidat entre
eux.

### C7. La lecture des PDF reconnaît les titres par leur taille seulement

Un intertitre de même taille que le texte, dans une autre police, n'est pas
reconnu. Brochure d'Arthaud : de la page 24 à la page 31, tout est rangé
sous « Le capitalisme, c'est la guerre », alors que la page 24 ouvre « Un
programme révolutionnaire à imposer par les luttes ». Un titre placé après
son texte dans le fichier (« NI CHAIR À PATRONS », dépliant) est lu après
lui.

**16 novembre 2026, en partie corrigé.** Un intertitre tout en gras dans
une autre police que le texte est maintenant reconnu (`fontFamily`,
`pdf-layout.ts`) : la brochure d'Arthaud passe de 8 à 27 titres. Le titre
écrit après son texte ne l'est pas : remonter un titre « écrit après tout
le texte de sa colonne » corrige le dépliant d'Arthaud (« LE MOUVEMENT DE
LA JEUNESSE »), mais change à tort les titres de 16 PDF sur 17 relus
(Philippot : des passages sur l'immigration passent sous « ÉNERGIE » ;
Retailleau : « PERMETTRE », « STRATÉGIQUES » deviennent des titres). La
règle n'est pas appliquée. Il faut une lecture fondée sur la géométrie de
la page entière (colonnes, bandeaux), comparée à l'actuelle sur les mêmes
fichiers avant d'être retenue (étape 7).

### C8. Les ports s'arrêtent à la lecture et au rangement

Existent : `ProgrammeReader`, `TopicClassifier` (et `SiteCrawler`,
`CampaignPageReader`). N'existent pas : le nettoyage, le rapprochement, le
découpage. Ces étapes sont des fonctions appelées en dur, sans choix de
stratégie possible.

### C9. Les comptes rendus n'étaient pas fiables

Le rangement comptait comme « nouvellement rangée » une unité que la base
refusait comme doublon (140 annoncés, 14 écrits le 16 novembre). Corrigé ;
le constat vaut pour toute la chaîne : un compte rendu doit compter ce qui
est écrit, pas ce qui est tenté.

### C10. Du code recopié au lieu d'être mis en commun (corrigé dans `backend/`)

**Corrigé le 16 novembre 2026** : le chargement des documents en vigueur
passe par `liveProgrammes`, et la correction d'un rangement par une personne
par `features/subjects/file-correction.ts`, partagé par la vérification et
la relecture. Dans `backend/`, les lignes en double passent d'environ 400 à
131 ; le reste est antérieur (en-têtes des scripts, relecture des jeux de
données) et ne touche pas la chaîne des programmes. Relevé de départ :


Relevé du 16 novembre 2026 (jscpd, blocs d'au moins 60 jetons, hors tests
et code généré) : 650 lignes en double sur 39 351, soit 1,6 %, en 32 blocs.
Le taux est faible ; la répartition compte plus que le taux.

| Bloc recopié | Copies | Où | Règle concernée |
|---|---|---|---|
| Charger les documents de programme en vigueur (`findMany` puis `currentCaptures`) | au moins 8 | `get-subject`, `get-candidate-subjects`, `check-cap-labels`, `review-cap-labels`, `common/subject-vectors`, scripts `compare-filing`, `audit-absences`, `apply-absence-decisions`, `embed-passages` | CONVENTIONS 5 : un accès aux données partagé va à la racine de la ressource (constat C5) |
| Lire les passages d'un rangement (filtre `inLabel`, témoignages) | 4 | `get-subject`, `get-candidate-subjects`, `review-cap-labels`, `common/subject-vectors` | idem ; la règle elle-même est déjà dans `domain/` |
| La carte d'un rangement | 2 | `check-cap-labels`, `review-cap-labels` | idem |
| Le dock des sujets | 2 | `admin/…/TopicDock.tsx`, `site/…/SubjectDock.tsx` | permis : aucun fichier commun entre applications (CONVENTIONS 2) |
| Les styles de verre | 2 | `admin/src/styles.css`, `site/src/styles.css` | permis, même raison |

Les copies entre `admin/` et `site/` sont voulues. Les copies dans
`backend/` ne le sont pas : `get-candidate-subjects` a été écrit le
16 novembre en recopiant `get-subject` au lieu d'en extraire la partie
commune. Le test d'architecture passe, car il interdit les imports entre
slices, pas les copies.

### C11. Des décisions de l'outil signées d'un compte de personne (corrigé)

**Corrigé le 16 novembre 2026** : un compte « Outil de rangement », créé
retiré (il ne se connecte jamais), signe les décisions de l'outil
(`domain/tool-account.ts`, migration `20261116210000_tool_account`). Les
1 776 décisions déjà prises en mode « assistant » portent maintenant sa
signature, ainsi que 11 retraits « remplacé par le rangement passage par
passage » qui étaient marqués à tort comme décisions de personne. Constat de
départ :


Le retrait des orphelins et le rerangement d'Arthaud retirent des
rangements non vérifiés avec `decisionMode = assistant`, mais
`decidedById` est le premier compte d'administration, parce que la base
exige une signature. Le mode dit la vérité, la signature non :
CONVENTIONS 5.1 veut que l'outil n'ait « aucune porte à lui » et ne
décide rien. Cible : un compte de service identifié comme tel, ou un statut
« remplacé » qui ne demande pas de décision.

### C12. Les acquis

- Les règles de nettoyage reconnaissent des **formes**, pas des sites
  (« À lire aussi », « Prénom – métier, lieu », un texte répété au même
  endroit sur trois pages).
- Le versionnement par empreinte, avec rétablissement.
- Les verdicts sont immuables (déclencheur `label_check_never_rewritten`).
- Le vote, le seuil mesuré sur des verdicts de personnes, le rapport
  historisé.

---

## 3. Architecture cible

### Les principes

1. **Une chaîne, la même pour tous.** Aucun nom de candidat ni de site dans
   le code de la chaîne.
2. **Un port seulement là où la variation est écrite** (CONVENTIONS, 5.1).
   Une source extérieure qui change (un format de fichier, un modèle de
   langue) passe par un port et ses adaptateurs. Une règle pure (nettoyer,
   rapprocher, découper) est une fonction de `domain/` ; ses stratégies sont
   des fonctions du domaine, choisies par une autre fonction du domaine
   d'après une mesure du document.
3. **Chaque choix est une donnée.** Stratégie retenue, mesure qui l'a
   décidée, date : enregistrés sur le document, visibles en administration,
   contestables.
4. **Nettoyer une fois, en amont.** Le rangement et l'affichage lisent le
   résultat du nettoyage ; ils ne refiltrent plus.
5. **Un passage écarté n'est pas effacé.** Il est marqué, avec sa raison.
6. **La citation reste exacte.** La normalisation sert à comparer, jamais à
   afficher : le texte publié est celui du document.
7. **Des objets stables.** Le chapitre et l'unité rangée ont un identifiant
   qui survit à une relecture.

### Les étages

```
Lire ──▶ Normaliser ──▶ Nettoyer ──▶ Rapprocher ──▶ Découper ──▶ Ranger ──▶ Publier
port      domain/         domain/       domain/       domain/      port       racine de
Reader                                                             Classifier la ressource
```

| Étage | Forme | Variation écrite | Sélection | Sortie |
|---|---|---|---|---|
| Lire | port `ProgrammeReader` (existe) | PDF, site, page d'archive | type du fichier | passages bruts, avec page et géométrie |
| Normaliser | une fonction de `domain/` | aucune | sans objet | forme de comparaison de chaque passage |
| Nettoyer | fonctions de `domain/`, appliquées en chaîne | une règle par forme : décor répété, témoignage, bouton, logistique, légende, en-tête | toutes, toujours | passage gardé ou écarté avec sa raison |
| Rapprocher | fonctions de `domain/` | empreinte exacte, ressemblance approchée (suites de mots, Jaccard) | toutes | groupes de doublons, un passage de référence par groupe |
| Découper | fonctions de `domain/` | par chapitre, par passage | mesure de dérive de sens dans le chapitre | unités stables à ranger |
| Ranger | port `TopicClassifier` (existe) | classeur, Qwen, vote | seuil mesuré (existe) | rangement |
| Publier | accès aux données à la racine de `features/public` | aucune | sans objet | ce que lit le site |

Le domaine décide, la slice orchestre (CONVENTIONS, 5.2) : la collecte
appelle la lecture, puis les fonctions du domaine dans l'ordre, puis
enregistre. Aucune slice n'en importe une autre.

### Le choix du découpage, par la mesure

Un chapitre est rangé en entier quand ses passages parlent du même sujet ;
il est découpé passage par passage quand le sens dérive en cours de route.
Mesure proposée : la ressemblance (cosinus) entre les vecteurs des passages
successifs d'un chapitre, et le nombre de sujets différents que le classeur
y voit. Le seuil vient d'une mesure sur tous les candidats (étape 0
ci-dessous), puis s'applique à tous. Arthaud serait découpée par passage
parce que sa brochure a cette forme, et tout candidat dont les chapitres ont
la même forme le serait aussi.

C'est la pratique du CAP et du Manifesto Project : l'unité codée est la
quasi-phrase quand un texte enchaîne les sujets (section 10 bis de
`06-rangement.md`).

### Les données

| Objet | Aujourd'hui | Cible |
|---|---|---|
| Passage | `measures`, une ligne par version de document | inchangé, plus sa forme normalisée et son empreinte |
| Passage écarté | absent (supprimé à la lecture ou filtré à la volée) | `passage_exclusions` : passage, règle, raison, date |
| Doublon | absent | `passage_matches` : groupe, passage de référence, méthode, ressemblance |
| Chapitre, unité | reconstruits à chaque rangement, clé = texte du titre | `filing_units` : identifiant stable, document, passages, stratégie de découpage |
| Choix de stratégie | absent | `document_strategies` : document, étage, stratégie, mesure, date |
| Rangement | `cap_labels`, clé = titre + sujet + unité | rattaché à l'identifiant d'unité |
| Version en vigueur | une fonction, `liveProgrammes`, recalculée à chaque lecture | calculée une fois à la collecte, marquée sur le document |

### Garantir l'égalité de traitement

- Aucune liste de candidats dans la chaîne ; un test le vérifie.
- **Test d'invariance** : un même document attribué à deux candidats
  différents donne exactement les mêmes passages, exclusions, unités et
  stratégies.
- La page Mesure affiche, par candidat, les stratégies retenues et les
  passages écartés par règle : un écart de traitement se voit.

---

## 4. Ordre de migration

Chaque étape se livre seule et ne casse pas la suivante.

0. **Mesurer, sans rien changer.** Par candidat : la dérive de sens dans les
   chapitres (pour fixer le seuil de découpage), les doublons exacts et
   approchés entre documents, les passages que chaque règle écarte à chaque
   étage.
1. **Une normalisation unique** dans le domaine ; les six normalisations
   locales l'appellent. (Le chargement des documents en vigueur est déjà
   mis en commun : C5, C10.)
2. **La version en vigueur marquée à la collecte** ; les 15 appels à
   `currentCaptures` lisent la marque.
3. **Le nettoyage une fois, en amont**, avec `passage_exclusions` ; une
   relecture applique les règles aux anciens passages ; l'affichage cesse de
   refiltrer.
4. **Les unités stables** (`filing_units`) et la migration des rangements
   existants vers elles. Point délicat : les verdicts sont immuables, le
   lien d'un verdict à son rangement doit survivre tel quel.
5. **Le découpage par la mesure** ; `PASSAGE_FILING` est supprimé.
6. **Le rapprochement** : un passage en double est rangé et vérifié une
   fois.
7. **La lecture des PDF par la géométrie et la police** (C7), comme une
   seconde stratégie de lecture PDF, comparée à la première sur les mêmes
   fichiers avant de la retenir.

## 5. À trancher par l'équipe

- Le seuil de dérive qui fait découper un chapitre (après l'étape 0).
- Entre deux copies d'un même passage, laquelle fait référence : le
  document le plus ancien, ou le programme principal du candidat.
- Les passages écartés : visibles en administration seulement, ou aussi
  sur la page publique (« textes non retenus : décor, témoignages »).
- Le sort des rangements dont l'unité change de forme à l'étape 5 (un
  chapitre rangé qui devient dix passages) : reclassement automatique, ou
  cartes à vérifier.
