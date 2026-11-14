# 02 · Architecture fonctionnelle et technique

NestJS · React · Prisma · PostgreSQL · Ports et adaptateurs

> Principe directeur : partir des statistiques publiques disponibles, les
> rendre lisibles et les relier aux mesures politiques.

L'arbitrage des ports (lesquels existent, lesquels sont remplacés par Prisma
ou par une slice) est dans `CONVENTIONS.md`, section 5.1.

## Chaîne de traitement

```
Sources officielles → SourceDataset → DatasetVersion → ImportJob
  → Observation brute → Normalisation → Validation → Observation publiée

Documents politiques → SourceDocument → Citation/Extrait → PoliticalMeasure
  → Liens éditoriaux vers les indicateurs → Publication
```

Frontend : explorer indicateurs, ressources, territoires et mesures ; API
publique séparée des routes d'administration.

## Modèle de données central

| Entité | Responsabilité / champs essentiels |
|---|---|
| `DataProvider` | Nom, type, URL officielle. |
| `SourceDataset` | Identifiant producteur, URL, licence, méthodologie, fréquence. |
| `DatasetVersion` | Millésime, collecte, hash, fichier brut, état de publication. |
| `IndicatorDefinition` | Code, définition, unité, catégorie, agrégation permise, méthode. |
| `Territory` | Code INSEE, type (commune, département, région, France), millésime géographique. |
| `Observation` | Indicateur, territoire, période, valeur, statut, source/version. |
| `PublicResource` | Métier, équipement ou capacité ; missions documentées. |
| `ResourceIndicatorLink` | Lien ressource ↔ indicateur, nature du lien. |
| `PoliticalParty` | Nom, sigle, identité et sources officielles. |
| `PoliticalDocument` | Programme, contre-budget, amendement, déclaration, URL, date. |
| `PoliticalMeasure` | Libellé normalisé, citation, action, horizon, statut éditorial. |
| `DeclaredAmount` | Valeur, unité, période, périmètre, preuve ; nullable. |
| `MeasureIndicatorLink` | Mesure ↔ indicateur, justification, statut de revue. |
| `ReviewEvent` | Auteur, action, horodatage, avant/après, justification. |

## Ports applicatifs

- `ISourceDatasetImporter.import(version)` ;
  `IObservationNormalizer.normalize(rows)` ;
  `IIndicatorRepository.upsert(observations)` ;
  `ITerritoryResolver.resolve(code, year)`.
- `IPoliticalDocumentImporter.import(source)` ;
  `IMeasureExtractor.extract(document)` ;
  `IMeasureRepository.saveDraft(measure)` ;
  `IMeasureIndicatorLinker.proposeLinks(measure)`.
- `IReviewWorkflow.submit/approve/reject` ;
  `IPublicIndicatorQuery.getSeries/getTerritoryBreakdown` ;
  `IPoliticalComparisonQuery.getMeasuresForIndicator`.

Les interfaces expriment des besoins métier ; les adapters CSV/API/PDF/Prisma
sont interchangeables. Aucun module par pilier n'est requis.

## API MVP

Publique :

```
GET /indicators
GET /indicators/:code
GET /indicators/:code/observations?territory=&year=
GET /territories/:code
GET /resources/:id
GET /political-parties
GET /measures?indicator=&party=
GET /comparisons?indicator=&territory=
```

Administration :

```
POST /admin/datasets/import
POST /admin/import-jobs/:id/validate
POST /admin/measures
POST /admin/measure-links
POST /admin/reviews/:id/approve
```

## IA future, sans dépendance structurelle

- Un agent peut utiliser les mêmes cas d'usage pour proposer extraction,
  normalisation et rapprochement ; il ne dispose pas d'accès direct à la
  base.
- Les sorties IA restent des brouillons avec provenance et niveau de
  confiance ; publication soumise au workflow humain.

## Tests et protections

- Tests d'unités (conversions permises, absence de valeur, gestion des
  périmètres), d'intégration des adapters, de contrat API et d'audit de
  publication.
- Gestion des licences de réutilisation, des données personnelles, des
  droits de reproduction et de la correction contradictoire des contenus
  politiques.
