# Conventions : Observatoire citoyen des politiques publiques

> **L'observatoire montre, il ne conclut pas.**
>
> Tout chiffre à l'écran remonte à un producteur, une définition, une unité,
> un millésime et un périmètre. Un chiffre publié par un organisme s'affiche ;
> un chiffre que l'on déduirait soi-même ne s'affiche pas.
>
> Les lits « manquants », les médecins « à recruter », le coût complet d'un
> service nouveau ne se calculent pas à partir d'une moyenne nationale. Ils
> apparaissent le jour où une source publie le besoin, sa méthode et son
> périmètre, et pas avant.
>
> **Aucun chiffre ne naît du rapprochement d'un indicateur et d'une mesure.**
> L'APL d'une commune et la promesse d'un parti sur l'accès aux soins
> s'affichent l'une à côté de l'autre, telles que publiées, et c'est le
> lecteur qui compare. Ni score, ni verdict, ni conversion d'unité implicite.

**Le code est en anglais, les explications et l'interface en français.** Les
chemins d'URL sont du code, publics compris : `/indicators/:code`,
`/measures/:id`, `/compare`, `/admin/imports/:id`. L'écran est français,
l'URL est en anglais.

**Un chemin qui change casse des liens déjà partis.** Une fiche indicateur
citée dans un article ou un fil de discussion doit rester joignable. Un
chemin public ne se renomme pas ; s'il le faut, l'ancien redirige.

**Renommer se fait avec les chaînes protégées.** Un `sed` global sur un dépôt
bilingue écrit « Ajouter un indicator » dans l'interface. Après tout
renommage :

```bash
node scripts/check-language.mjs
```

Il refuse aussi, dans tout texte affiché, les mots de verdict sur une
formation (section 1.5), le tiret long et les tournures « Ce qui… »,
« Ce qu'on… », « Ce que vous… ».

---

## 1. Les règles de données et de publication

Elles priment sur toute autre règle de ce document. Une violation fausse ce
que l'observatoire affirme, et rien ne se rattrape après publication. Les
sections 1.1 à 1.4 protègent l'exactitude des chiffres, les sections 1.5 à
1.9 protègent l'observatoire face aux formations politiques, la section 1.10
décrit le modèle éditorial.

| Cas | Comportement |
|---|---|
| Donnée absente | « non documenté », jamais zéro, jamais un trait de courbe interpolé |
| Échelles incompatibles | affichées séparément, la différence expliquée |
| Postes, personnes, ETP | trois indicateurs distincts |
| Lits, places, capacités HAD | catégories distinctes |
| Besoin chiffré | uniquement s'il est publié par un organisme, avec sa méthode |
| Coût | salaire net, brut, coût employeur et coût complet distingués |
| Montant partisan | programme, contre-budget, amendement, discours, budget voté distingués |
| Comparaison | aucun classement de crédibilité, de sincérité ou de contradiction |

### 1.1 L'absence est une valeur

`Observation.value` est nullable et porte un `status`
(`published`, `not_documented`, `confidential`, `not_applicable`). Un `null`
ne devient jamais `0` : ni dans une somme, ni dans une moyenne, ni dans une
couleur de carte. Une carte a une teinte « non documenté » distincte de
l'échelle.

Le piège est dans les utilitaires : `values.reduce((a, b) => a + (b ?? 0))`
publie un faux total. Les agrégations vivent dans `domain/` et refusent un
`null` au lieu de l'absorber. Une agrégation n'est permise que si
`IndicatorDefinition.allowedAggregation` la déclare.

### 1.2 Aucune conversion implicite

Une valeur voyage avec son unité. `domain/units.ts` porte la liste fermée des
conversions permises (k€ vers €, ‰ vers %), et toute autre conversion est une
erreur de compilation ou d'exécution, jamais un calcul silencieux. Deux
séries d'unités différentes ne partagent pas un axe.

### 1.3 Une mesure politique est une citation

`PoliticalMeasure` porte la citation exacte, le document, sa date, son auteur
et son horizon. Le libellé normalisé aide à la recherche ; il ne remplace
jamais la citation à l'écran. `DeclaredAmount` est nullable : un parti qui ne
chiffre pas n'a pas de montant, et l'interface ne lui en prête pas.

Un lien mesure ↔ indicateur porte une justification thématique et un statut de
revue. Il n'établit aucune équivalence financière.

### 1.4 Les règles tenues par la base

| Règle | Comment |
|---|---|
| Une absence n'a jamais de valeur | `CHECK observation_value_matches_status` |
| Un fichier déposé et ses lignes lues ne se réécrivent pas | triggers `raw_rows_never_rewritten`, `dataset_version_file_never_rewritten` |
| Le même fichier ne se dépose pas deux fois pour un jeu | unique `(datasetId, fileHash)` |
| Une observation est unique pour (indicateur, territoire, période, version) | index unique |
| Les observations d'une version qui n'est plus un brouillon ne bougent plus | trigger `observations_frozen_outside_draft` |
| Seules les transitions du circuit existent ; une version publiée ne change plus, sauf pour être remplacée | trigger `dataset_version_transition` |
| Publier demande une autre personne que celle qui a soumis ou prépublié | même trigger (quatre yeux) |
| Une seule version visible du public par jeu | unique partiel `dataset_versions_one_public` |
| Une trace de revue ne se modifie ni ne se supprime | trigger `review_events_never_rewritten` |
| Un territoire chargé ne se réécrit pas | trigger `territories_never_rewritten` |

Les règles dont la violation fausserait une provenance sont en base. Les
règles de calcul et d'affichage sont dans `domain/`.

### 1.5 Diffamation : la citation fait foi, le résumé n'ajoute rien

Une allégation qui porte atteinte à l'honneur d'une formation relève de la
loi du 29 juillet 1881. Une citation exacte, sourcée et datée n'en est pas
une ; un résumé qui la déforme peut en devenir une. Le risque se loge dans
le libellé normalisé, jamais dans la citation.

- **La citation s'affiche avant le libellé**, sur chaque écran et dans
  chaque export. Un libellé seul, sans sa citation, ne s'affiche nulle part.
- **Le libellé reformule, il ne qualifie pas.** Il reprend l'action, l'objet
  et l'horizon de la citation, sans adjectif ni adverbe d'appréciation.
  « Recruter 4 000 médecins d'ici 2030 » et non « Promesse ambitieuse de
  recruter 4 000 médecins ».
- **Le libellé passe en revue** comme la mesure : une seconde personne
  vérifie qu'il ne dit rien de plus que la citation.
- **Aucun mot de verdict dans l'interface** : mensonge, contradiction,
  irréaliste, intenable, crédible, sincère, démagogique, populiste.
  `scripts/check-language.mjs` les refuse dans tout texte affiché. La page de
  méthode énonce la règle sans les employer.

En cas de procès, le juge apprécie la bonne foi sur quatre critères : but
légitime, absence d'animosité, prudence de l'expression, sérieux de la
vérification. Les trois derniers se prouvent par la base : `ReviewEvent`
garde qui a saisi, qui a relu, d'après quel document, à quelle date. Un
`ReviewEvent` ne se supprime pas.

### 1.6 Droit d'auteur : l'extrait se publie, le document se garde

Un programme est une œuvre protégée, même diffusé gratuitement. La courte
citation avec sa source est permise (article L122-5 du code de la propriété
intellectuelle) ; la republication intégrale ne l'est pas.

| Objet | Stocké | Publié |
|---|---|---|
| Programme, tract, page de site d'un parti | fichier brut, empreinte, date de collecte | l'extrait cité et le lien vers l'original |
| Amendement, texte de loi, débat parlementaire | fichier brut | l'extrait, le lien, et le document entier si utile |
| Discours en réunion publique | transcription, source de l'enregistrement | l'extrait et le lien |

- `PoliticalDocument.rawFile` n'a **aucune route publique**. Il sert de
  preuve, il n'est pas un téléchargement.
- `PoliticalDocument.publicationRights` vaut `excerpt_only` par défaut ;
  `full_document` exige une autorisation écrite de la formation ou un
  document officiel, enregistrée comme pièce.
- Quand l'original disparaît du site du parti, le lien bascule vers une
  archive tierce (Internet Archive, archives de la BnF) relevée à la
  collecte : `PoliticalDocument.archiveUrl`.

### 1.7 Droit de réponse et rectification

Toute personne mise en cause en ligne peut exiger l'insertion d'une réponse
dans les trois mois suivant la mise en ligne (article 6 de la loi pour la
confiance dans l'économie numérique). Le document 04 étend la règle : un
droit de signalement et de rectification identique pour toutes les
formations.

- **Une seule porte**, publique et documentée : un formulaire et une adresse
  dédiée, accessibles depuis chaque fiche mesure et chaque fiche parti.
- **Chaque demande devient un objet** (`CorrectionRequest`) : demandeur,
  objet visé, date de réception, réponse, décision, date de traitement. Le
  délai légal se calcule depuis la réception, dans `domain/`.
- **Une correction crée une version**, jamais une réécriture : l'ancienne
  version reste consultable, avec la justification et la date du changement.
- **Une réponse insérée s'affiche sur la fiche concernée**, distinguée du
  contenu éditorial, signée par son auteur.
- **La même procédure pour toutes les formations**, sans exception ni voie
  rapide.

### 1.8 Égalité de traitement et méthode publiée

Aucune loi n'impose l'équilibre à un site privé (le temps de parole contrôlé
par l'Arcom concerne l'audiovisuel). Le risque est le reproche de
partialité, et il se joue sur deux choix éditoriaux : quelles mesures sont
collectées, et à quels indicateurs elles sont reliées.

- **La liste des formations suivies et le critère d'entrée sont publiés**
  (par exemple : représentation au Parlement, ou candidature à l'élection
  couverte). Le critère s'applique à toutes.
- **La liste des documents collectés par formation est publique**, avec leur
  date de collecte. Une formation voit ce qui a été lu d'elle.
- **Une omission se corrige comme une erreur** : par la procédure de la
  section 1.7, avec trace.
- **Un lien mesure ↔ indicateur porte sa justification**, visible à côté du
  lien, et passe en revue.
- **Le même traitement visuel pour toutes** : ordre alphabétique, aucune
  couleur partisane, aucune mise en avant (section 4.8).
- **Avant un scrutin, deux relecteurs au lieu d'un.** Pendant une période
  fixée par la méthode publiée, toute publication, correction comprise, est
  approuvée par deux personnes distinctes de son auteur.

### 1.9 Responsabilité éditoriale et données personnelles

- **L'observatoire est éditeur** de tout contenu saisi par son équipe, et
  responsable comme tel. Les mentions légales nomment l'éditeur (une
  personne morale, pas une personne physique) et le directeur de la
  publication.
- **Les contributions publiques du lot 5 relèvent du régime d'hébergeur** :
  elles restent séparées du contenu éditorial, marquées comme
  contributions, et un contenu signalé manifestement illicite se retire
  rapidement, avec trace.
- **Les responsables politiques sont des personnes** : leurs noms et
  déclarations sont des données personnelles qu'ils ont rendues publiques.
  Leur traitement est déclaré dans la politique de confidentialité.
- **Les comptes collectent le minimum** : un courriel et un rôle pour
  l'équipe ; pour un représentant, en plus, la formation représentée et la
  pièce qui l'atteste. Aucun traceur publicitaire sur le site.
- **Avant le lancement public**, la méthode et ces règles sont relues par un
  avocat en droit de la presse. La date et les remarques de cette relecture
  sont consignées ici.

### 1.10 Le modèle éditorial : une revue en accès ouvert

Décidé le 14 novembre 2026 : contribuer comme sur Wikipédia, relire comme
une revue scientifique.

**Le circuit d'une version**

```
draft ──► in_review ──► published ──► superseded
  │           │             ▲
  │           └──► draft    │   (révisions demandées)
  └──► preprint ────────────┘
          └──► superseded
```

- **Relecture avant publication, pour tout.** Rien n'est `published` sans
  une autre personne que celle qui a soumis.
- **Prépublication** (`preprint`), comme arXiv : publiée par son seul
  auteur, visible du public avec l'étiquette « Prépublication : vérifiée par
  son seul auteur, en attente de relecture ». Pendant le lancement, seule
  l'administration prépublie (capacité `preprint`), et seulement des
  statistiques. **Une mesure politique ne se prépublie jamais.**
- **Relecture ouverte** : les décisions et, à venir, les rapports de
  relecture sont publics, signés.
- **À venir** : un éditeur par pilier qui désigne les relecteurs ; quatre
  décisions (acceptée, révisions mineures, révisions majeures, refusée) ;
  erratum et rétractation.
- **Nombre de relecteurs** : un pour une statistique ; deux pour une mesure
  politique ou un lien mesure ↔ indicateur, dont au moins un sans
  engagement déclaré.

**Les personnes**

- **Vrai nom pour tous**, visible du public ; le courriel ne se montre
  jamais.
- **Engagements déclarés** (adhésion, mandat, candidature, emploi auprès
  d'un parti ou d'un élu), affichés sur les contributions et les rapports.
  On ne trie pas les gens : on contraint ce qu'un relecteur décide seul
  (section 1.5) et le lecteur juge.
- **Effacement (RGPD)** : l'historique reste entier, le nom affiché devient
  « contributeur anonymisé ».

**Les licences**

- **Contenu de l'observatoire : CC BY-SA 4.0** (fiches, définitions,
  descriptions, liens, résumés, rapports, historique).
- **Données des producteurs** : leur licence, affichée à côté.
- **Citations des partis** : droit de courte citation, l'auteur reste le
  parti.
- **Code : AGPL-3.0.**

---

## 2. Le dépôt : trois applications, aucun fichier commun

```
site/      landing SSR (TanStack Start)       une page, lue par les moteurs
client/    application CSR (TanStack Router)  explorateur, fiches, comparateur, admin
backend/   API NestJS                          /api/public/* et /api/admin/*
```

**La landing est la seule page rendue côté serveur.** Elle porte le message,
quelques chiffres publiés et les entrées vers l'application. Elle n'a ni
compte, ni état client, ni formulaire.

**Un chiffre de la landing vient de l'API, jamais de `site/src/data/`.** Écrit
en dur, il perdrait sa provenance et vieillirait sans le dire. Le `loader` de
la route le lit sur `/api/public/*` au rendu, avec son millésime et sa
source ; si l'API ne répond pas, le bloc disparaît plutôt que d'afficher un
chiffre périmé.

**Passer une fiche en SSR plus tard** (pour qu'une fiche indicateur soit
indexée) ne se fait pas en déplaçant l'application : c'est une décision à
part, à poser ici avant d'écrire le code.

---

## 3. `site/` : la landing

Même organisation que le site d'AI Robotics.

```
site/src/
  routes/       __root.tsx · index.tsx            composition seule
  components/   ui/ (briques) · landing/ (blocs)
  data/         textes, liens, piliers             aucun chiffre statistique
  services/     public-api.ts                      fetch côté serveur
  utils/        seo.ts                             meta, Open Graph, JSON-LD
  styles/       app.css                            thème, tokens
```

- **La route compose.** `routes/index.tsx` importe les blocs et le `loader`,
  rien d'autre.
- **Chaque bloc occupe un écran plein.** Une landing sombre ne finit jamais
  sur un bloc clair.
- **Les textes vivent dans `data/`**, typés, jamais au fil du JSX.
- **Un composant fait moins de 100 lignes.**
- **Le lien vers l'application** vient de `VITE_APP_URL`, jamais en dur.

---

## 4. `client/` : l'application, en cinq couches

Le principe central : **chaque couche a une seule responsabilité et ne connaît
que la couche du dessous**. Les données montent
(Service → State → Hook → Composant) ; les événements descendent
(clic → handler du hook → mutation → service).

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Couche 5  Routes         routes/       Assemblage seul. Zéro logique.      │
│  Couche 4  Composants UI  components/   Props in, events out.               │
│  Couche 3  Feature Hooks  hooks/        Orchestration : state + services.   │
│  Couche 2  State          stores/ + TanStack Query                          │
│  Couche 1  Services       api/          HTTP isolé.                         │
└───────────────────────────────────────────────────────────────────────────┘
        transversal : domain/ · types/ · utils/ · layouts/
```

### Stack

| Domaine | Outil |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Routing | TanStack Router (routing par fichiers) |
| State serveur | TanStack Query |
| State client | Zustand (+ `persist`) |
| HTTP | Axios, une instance |
| Formulaires | react-hook-form + zod |
| Styles | Tailwind CSS v4 |
| Icônes | lucide-react |
| Cartes | MapLibre GL, fonds IGN |

### 4.1 Couche 1 : `api/`

Un composant ne fait **jamais** de `fetch` ni d'appel Axios. Une instance
unique dans `api/client.ts`, base URL lue dans `VITE_API_URL`. Un fichier par
domaine : `indicators.api.ts`, `territories.api.ts`, `measures.api.ts`,
`parties.api.ts`, `comparisons.api.ts`, puis `admin/*.api.ts`.

Le service ne connaît ni React, ni le store, ni les composants.

**Les droits ne se filtrent pas ici.** Un brouillon non publié n'est jamais
envoyé à un visiteur : l'API publique ne le renvoie pas. Le masquer côté
front enverrait les brouillons dans le navigateur de tout le monde.

### 4.2 Couche 2 : state

| Nature | Outil | Exemples |
|---|---|---|
| State serveur | TanStack Query | indicateurs, observations, mesures, imports |
| State client | Zustand | session admin, filtres de l'explorateur, préférence d'affichage |

Jamais de donnée serveur dans Zustand. `queryKey` du général au particulier :

```ts
["indicators"]
["indicators", code]
["indicators", code, "observations", { territory, year }]
["measures", { indicator, party }]
["admin", "import-jobs", jobId]
```

**Les filtres de l'explorateur vivent dans l'URL**, pas dans Zustand :
territoire, année, producteur, unité. Un lien partagé doit rouvrir la même
vue, et le bouton retour du navigateur doit revenir au filtre précédent.

### 4.3 Couche 3 : `hooks/<domaine>/`

Appeler un service, mettre à jour le cache, dériver une valeur d'affichage.
Un dossier par domaine : `indicators`, `territories`, `measures`,
`comparisons`, `admin`. `queryKeys.ts` à la racine de `hooks/`.

Une mutation invalide **toutes** les clés concernées : publier une version de
jeu change la fiche indicateur, ses observations et le comparateur.

**Le piège de `enabled`** : une requête désactivée reste `pending` pour
toujours. Attendre sur `q.isPending && q.fetchStatus !== "idle"`.

### 4.4 Couche 4 : `components/`

Purement présentationnels, **props in, events out**. Trois niveaux, décidés
par des tests mécaniques :

| Niveau | Test |
|---|---|
| `atoms/` | n'importe aucun composant du projet, ignore le métier, moins de 50 lignes |
| `molecules/` | assemble des atomes, ignore toujours le métier |
| `organisms/<domaine>/` | connaît un type métier : `Indicator`, `Observation`, `PoliticalMeasure`… |

```bash
grep -rlE 'from "\.\./(atoms|molecules|organisms)/' src/components/atoms     # vide
grep -rlE 'from "\.\./\.\./(types|domain|data)'   src/components/atoms     # vide
grep -rlE 'from "\.\./\.\./(types|domain|data)'   src/components/molecules # vide
```

Le contrôle voit les imports, pas un statut écrit en chaîne : un composant
qui écrit `"not_documented"` au lieu d'importer le type ment au grep.

Trois organismes portent la crédibilité de l'observatoire et suivent des
règles de conception :

- **`ProvenanceLine`** accompagne chaque valeur : producteur, jeu, millésime,
  date de collecte, lien vers l'original. Une valeur sans elle ne s'affiche
  pas.
- **`ValueCell`** reçoit une `Observation`, jamais un `number`. C'est elle qui
  écrit « non documenté », et personne d'autre.
- **`MeasureQuote`** affiche la citation entre guillemets, le document et sa
  date, avant le libellé normalisé.

### 4.5 Couche 5 : `routes/`

Assemblage seul, moins de 100 lignes, aucun appel HTTP.

```
routes/
  __root.tsx
  _public.tsx                       layout sans compte
  _public/
    index.tsx                       les douze piliers
    pillars.$pillar.tsx
    indicators.index.tsx            l'explorateur
    indicators.$code.tsx            la fiche indicateur
    territories.$code.tsx
    resources.$id.tsx
    measures.$id.tsx
    parties.$slug.tsx
    compare.tsx                     le comparateur
    signin.tsx
  _admin.tsx                        garde d'authentification
  _admin/
    imports/                        index · $jobId (prévisualisation, mapping, anomalies)
    datasets/  indicators/  measures/  links/  reviews/
```

### 4.6 Guards

Par `beforeLoad` sur la route parente, jamais par un composant : le contrôle
avant chargement évite le flash de contenu protégé. La garde du front ne
protège rien en soi ; l'API refuse de son côté.

### 4.7 Règles d'imports

| Un fichier dans… | peut importer de… | ne doit pas importer de… |
|---|---|---|
| `routes/` | `hooks/`, `components/`, `layouts/`, `types/` | `api/`, `stores/` (hors `beforeLoad`) |
| `components/` | `components/`, `types/`, `utils/` | `stores/`, `api/`, `hooks/` |
| `hooks/` | `stores/`, `api/`, `domain/`, `utils/`, `types/` | `components/`, `routes/` |
| `domain/` | `types/` | tout le reste |
| `stores/` | `utils/`, `types/` | `components/`, `hooks/`, `routes/`, `api/` |
| `api/` | `api/client`, `types/` | tout le reste |

### 4.8 Styles

Tailwind v4, couleurs et rayons dans le thème, jamais en hexadécimal au fil
du code. Les statuts ont des tokens : `published`, `draft`, `in_review`,
`rejected`, `not_documented`.

**Aucune couleur partisane.** Un parti ne reçoit ni sa couleur de campagne ni
une couleur d'échelle : tous les partis partagent le même traitement visuel,
dans l'ordre alphabétique de leur nom.

---

## 5. `backend/` : l'API, rangée par cas d'usage

```
backend/src/
  domain/                   règles pures : unités, agrégations, absence, statuts
  ports/                    les interfaces dont la variation est écrite
  adapters/                 csv/ · xlsx/ · api/ · pdf/
  generated/prisma/         client généré, jamais modifié, jamais commité
  features/
    datasets/
      import-dataset-version/
      validate-import-job/
      publish-dataset-version/
    measures/
      create-measure/
      link-measure-to-indicator/
    reviews/
      approve-review/
    public/
      list-indicators/
      get-indicator-observations/
      get-comparison/
  prisma/ · auth/ · common/   infrastructure
```

**Une slice, c'est un geste.** `features/<ressource>/<verbe-objet>/` : un
fichier porte le DTO, la route et le traitement. La liste des dossiers est la
liste de ce que l'API sait faire.

**L'API publique et l'API d'administration sont séparées dès le routage.**
`/api/public/*` ne lit que des objets publiés et n'a aucune route
d'écriture. `/api/admin/*` passe par la garde d'authentification et de rôle.

**Une slice n'importe jamais une autre slice.** Le partagé va dans `domain/`
si c'est une règle, à la racine de la ressource si c'est un accès aux
données, dans l'infrastructure si c'est de la technique. Pas de `helpers/`.

### 5.1 Les ports : uniquement là où la variation est écrite

Le document d'architecture liste des ports pour chaque étape. Une abstraction
se justifie par une variation écrite, jamais par une variation supposée. Le
tri :

| Port | Variation écrite | Décision |
|---|---|---|
| `SourceDatasetImporter` | CSV, XLSX, API, PDF | **port**, un adapter par format |
| `PoliticalDocumentImporter` | PDF, page web | **port** |
| `MeasureExtractor` | saisie humaine aujourd'hui, IA demain | **port** |
| `ObservationNormalizer` | une règle par jeu (codes producteur, unités) | **port**, un normaliseur par jeu |
| `TerritoryResolver` | millésimes du COG INSEE | fonction de `domain/`, table en base |
| `IndicatorRepository`, `MeasureRepository` | aucune | **pas de port** : Prisma en est déjà un |
| `ReviewWorkflow` | aucune | slices `submit`, `approve`, `reject` |
| `PublicIndicatorQuery`, `PoliticalComparisonQuery` | aucune | slices de `features/public/` |

Ports nommés par leur rôle, sans préfixe `I`, injectés par jeton `Symbol`.

**L'IA n'a pas de porte à elle.** Elle passe par `MeasureExtractor` et les
mêmes slices que l'humain. Ses sorties sont des brouillons avec provenance et
niveau de confiance ; elle n'a aucun accès direct à la base et ne publie
rien.

### 5.2 Le domaine décide, la slice orchestre

`backend/src/domain/` n'importe que lui-même, Node et
`generated/prisma/enums`. Vérifié par `src/architecture.spec.ts` à chaque
`npm test`, avec l'interdiction d'import entre slices.

### 5.3 Les rôles

| Rôle | Capacités | Écrit |
|---|---|---|
| visiteur | aucune | rien ; lit ce qui est publié ou prépublié |
| `editor` | `edit` | déclare, dépose, décrit, contrôle, soumet ; deviendra `contributor` à l'ouverture des inscriptions |
| `reviewer` | `edit`, `review` | en plus : approuve ou rejette, jamais son propre travail |
| `admin` | `edit`, `review`, `preprint`, `manage_accounts` | en plus : prépublie, gère les comptes |
| éditeur de pilier (à venir) | | désigne les relecteurs de son pilier |
| `party_representative` (à venir) | | dépose des pièces, demande une rectification, ne relit jamais |

`editor` est le rôle de code d'un contributeur : il ne désigne pas l'éditeur
de pilier, qui est une fonction éditoriale.

---

## 6. Nommage

- Code en **anglais**, commentaires et interface en **français**.
- Une classe se décrit **en une phrase sans « et »**.
- `Manager`, `Helper`, `Handler`, `Utils` sont interdits.
- Les entités gardent les noms du document d'architecture : `DataProvider`,
  `SourceDataset`, `DatasetVersion`, `IndicatorDefinition`, `Territory`,
  `Observation`, `PublicResource`, `PoliticalParty`, `PoliticalDocument`,
  `PoliticalMeasure`, `DeclaredAmount`, `MeasureIndicatorLink`,
  `ReviewEvent`.
- **Aucun module par pilier.** Le pilier est une donnée
  (`IndicatorDefinition.pillar`), pas un dossier.

---

## 7. Tests

- **Unités** (`domain/`) : conversions permises et refusées, absence de
  valeur dans chaque agrégation, périmètres incompatibles.
- **Adapters** : un fichier réel par format, réduit, versionné dans
  `test/fixtures/` avec sa source.
- **Contrat** : `/api/public/*` ne renvoie jamais un brouillon.
- **Audit** : chaque publication produit son `ReviewEvent`.
- **Architecture** : `architecture.spec.ts`.

---

## 8. Checklist : nouvel écran

- [ ] Chaque valeur passe par `ValueCell` et porte sa `ProvenanceLine`.
- [ ] Une donnée absente s'affiche « non documenté » ; aucun graphique ne la comble.
- [ ] Aucune unité convertie hors de `domain/units.ts`.
- [ ] Aucun score, rang ou couleur partisane.
- [ ] Une mesure affiche sa citation avant son libellé, avec document et date.
- [ ] Aucun fichier brut de document politique n'est servi par une route publique.
- [ ] Une fiche mesure ou parti donne accès à la demande de rectification.
- [ ] La route fait moins de 100 lignes et n'importe pas `api/`.
- [ ] Les filtres partageables vivent dans l'URL.
- [ ] Les mutations invalident toutes les `queryKey` concernées.
- [ ] `node scripts/check-language.mjs` ne signale rien.

## 9. Checklist : review

```bash
# Un null transformé en zéro
grep -rnE "\?\? ?0\b|\|\| ?0\b" client/src backend/src site/src

# Routes qui importent un store hors beforeLoad
grep -rn "stores/" client/src/routes --include="*.tsx" | grep -v beforeLoad

# Composants qui importent un store ou l'API
grep -rEn "from .*(stores|api/)" client/src/components --include="*.tsx"

# Appels HTTP hors de api/
grep -rEn "axios|fetch\(|apiClient" client/src/{routes,components,stores,domain}

# Domaine pur
grep -rEn "react|axios|zustand|@nestjs|@prisma/client" client/src/domain backend/src/domain

# Couleurs en dur
grep -rn "#[0-9A-Fa-f]\{6\}" client/src site/src --include="*.tsx"

# Fichier brut d'un document politique exposé publiquement
grep -rn "rawFile" backend/src/features/public

# Chiffre statistique écrit en dur dans la landing
grep -rnE "[0-9]{2,}[  ]?[0-9]{3}" site/src/data
```

---

## 10. Écriture

S'applique à l'interface, aux commentaires, à la documentation et aux
messages de commit.

- Pas de tiret long : deux-points, virgule, parenthèses ou point-virgule.
- Pas de formule qui annonce le propos au lieu de le dire. Un titre nomme son
  contenu.
- Pas de « Ce qui… », « Ce qu'on… », « Ce que vous… ».
- **Un commit, un cas d'usage.** Chaque commit livre un geste précis de
  l'utilisateur final (un citoyen qui consulte, une personne de l'équipe qui
  importe, relit ou publie), complet : base, domaine, route, tests. La
  technique qui le rend possible voyage avec lui, jamais dans un commit à
  part (« set up Prisma », « add utils »).
- Le message est en anglais et décrit ce geste vu par la personne qui le
  fait. Aucune ligne d'attribution à un outil.

---

*Adapté des conventions du suivi de parc AI Robotics (couches de
l'application, slices de l'API) et du site AI Robotics (landing SSR). Les
règles de données de la section 1 sont propres à l'observatoire.*
