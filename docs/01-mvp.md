# 01 · Cahier des charges MVP

Vision, périmètre, parcours, fonctionnalités et critères d'acceptation.

> Principe directeur : partir des statistiques publiques disponibles, les
> rendre lisibles et les relier aux mesures politiques.

## Finalité produit

- Rendre consultables des indicateurs publics existants (état, évolution,
  disparités territoriales) et rattacher aux mêmes sujets les propositions
  publiées par les partis.
- Ne pas évaluer la sincérité, la crédibilité ou la « contradiction » d'un
  parti. Ne pas inventer des besoins, coûts, budgets ou répartitions
  annuelles.
- Couverture structurelle des 12 piliers ; lancement par jeux de données
  vérifiés, avec extension progressive.

## Les 12 piliers

Agriculture et alimentation · Santé · Éducation et recherche · Énergie ·
Logement · Transports et infrastructures · Travail, économie et industrie ·
Protection sociale · Sécurité, justice et défense · Environnement et
ressources · Institutions et services publics · Culture, sports et
associations

## Fonctionnalités publiques

- **Explorateur d'indicateurs** : recherche par sujet, territoire, année,
  unité et producteur ; valeur, tendance, distribution, carte et
  téléchargement de la source.
- **Fiche indicateur** : définition, champ, méthodologie, millésime, date de
  collecte, liens originaux, limites et statut de qualité.
- **Fiche ressource** : effectif ou capacité, rôle/missions, coûts
  documentés, indicateurs de tension et évolution ; chaque dimension est
  facultative si indisponible.
- **Fiche mesure politique** : citation exacte, auteur/parti, programme,
  date, territoire, horizon, montants déclarés et références ; association
  aux indicateurs pertinents.
- **Comparateur** : situation observée et propositions des partis côte à
  côte, sans score, verdict ni conversion implicite des unités.
- **Cartes** communales/départementales lorsque les jeux de données et les
  limites géographiques le permettent ; filtres nationaux et territoriaux.

## Back-office documentaire

- Importer CSV, XLSX, API ou PDF ; enregistrer la source, sa licence, son
  URL, sa date, sa version et son empreinte.
- Prévisualiser les colonnes, mapper unités, géographies et années ;
  signaler les anomalies et doublons ; valider avant publication.
- Créer ou importer les mesures des partis, relier une mesure à plusieurs
  indicateurs, conserver le passage original et la preuve.
- Historiser corrections, versions et décisions de modération ; les
  représentants politiques peuvent soumettre des pièces mais pas valider
  leurs propres données.

## Règles de données non négociables

| Cas | Comportement |
|---|---|
| Donnée absente | Afficher « non documenté » ; jamais zéro. |
| Échelles incompatibles | Afficher séparément et expliquer la différence. |
| Postes / personnes / ETP | Conserver des indicateurs distincts. |
| Lits / places / capacités HAD | Conserver des catégories distinctes. |
| Besoin chiffré | Uniquement si un organisme publie une mesure et sa méthode. |
| Coût | Différencier salaire net, brut, employeur et coût complet. |
| Budget partisan | Distinguer programme, contre-budget, amendement, discours et budget voté. |
| Comparaison | Pas de classement automatique de crédibilité ou de contradictions. |

## Parcours de référence

1. Un utilisateur choisit Santé > accès aux médecins > commune ; consulte
   l'APL, son millésime, sa définition et la source DREES.
2. Il ouvre les propositions des partis liées à l'accès aux soins ; lit les
   engagements exacts, montants éventuels, période et document d'origine.
3. Il peut comparer les propositions sans transformer automatiquement l'APL
   en « nombre de médecins manquants ».
4. Un autre utilisateur consulte Éducation > CP > REP/REP+ > élèves par
   classe, puis les propositions liées au dédoublement ou aux recrutements.

## Critères d'acceptation

- Un jeu DREES et un jeu DEPP sont importés, versionnés, publiés et
  consultables avec filtres géographiques et temporels.
- Chaque valeur affichée remonte à une source, une définition, une unité, un
  millésime et un périmètre.
- Une proposition politique peut être liée à plusieurs indicateurs sans
  forcer une équivalence budgétaire.
- Les erreurs d'import sont détectables et corrigibles dans
  l'administration ; toute publication est traçable.
- Les données manquantes ne produisent ni chiffres, ni graphiques trompeurs.
