# Observatoire citoyen des politiques publiques

Rendre lisibles les statistiques publiques existantes et rattacher aux mêmes
sujets les mesures publiées par les partis. L'observatoire montre l'état,
l'évolution et les disparités territoriales d'un indicateur, puis les
propositions qui s'y rapportent, côte à côte. Il ne note pas, ne classe pas et
ne conclut pas.

## Ce que fait l'application

- **Des articles** : chaque article nomme un enjeu (« Accès aux médecins
  généralistes »), le découpe en parties, choisit pour chacune des
  indicateurs officiels avec la raison du choix, et met côte à côte les textes
  déposés par chaque groupe politique, cités mot pour mot. Un article est
  signé, versionné, relu avant publication.
- **Une carte** : la France commune par commune, une région à la fois si on
  veut zoomer, la recherche d'une commune par son nom, et pour chaque commune
  une fiche avec tous ses chiffres et leur source.
- **Les programmes de la présidentielle 2027** : sur l'accueil, chaque
  candidat déclaré, la source de sa déclaration, et l'état de son programme
  (complet, partiel, rien de publié) à la date de la vérification.
- **Un comparateur** : groupe par groupe, les textes déposés sur un enjeu,
  sans note ni verdict.
- **Une API publique**, en lecture seule, ouverte à toute origine
  (`/api/public`), décrite sur la page « Développeurs » du site.

L'outil se nourrit seul : il collecte les textes déposés au Parlement, lit à
la demande les chiffres d'une commune chez leur producteur, et importe les
gros fichiers officiels. Tout est décrit dans `docs/05-alimentation.md`.

Douze piliers : agriculture et alimentation, santé, éducation et recherche,
énergie, logement, transports et infrastructures, travail, économie et
industrie, protection sociale, sécurité, justice et défense, environnement et
ressources, institutions et services publics, culture, sports et associations.
Le lancement se fait jeu de données vérifié par jeu de données vérifié.

## Le dépôt

```
site/      ce que lit le public, rendu côté serveur
           TanStack Start · Tailwind v4
admin/     l'administration de l'équipe, rendue dans le navigateur
           React 19 · TanStack Router · TanStack Query · react-hook-form · zod · Tailwind v4
backend/   l'API publique et l'API d'administration
           NestJS 11 · Prisma 7 · PostgreSQL 17
docs/      le cahier des charges, l'architecture, l'inventaire, la feuille de route
scripts/   contrôles transverses (langue)
```

La frontière passe entre le public et l'équipe. Tout ce que lit le public
(articles, carte, fiches, valeurs, historique) est rendu côté serveur, pour
être trouvé et partagé. L'administration ne sert qu'à l'équipe connectée, et
partage l'origine de l'API : cookie de session réservé à `/api/admin`, aucune
origine extérieure admise. L'API publique, elle, se lit depuis n'importe quel
site (CORS ouvert en lecture seule).

```
observatoire.<domaine>              site/     SSR (Node)
observatoire.<domaine>/api/public   backend/
admin.observatoire.<domaine>        admin/    fichiers statiques
admin.observatoire.<domaine>/api    backend/
```

## Démarrer

L'API, avec PostgreSQL 17 en local :

```bash
cd backend
cp .env.example .env              # puis renseigner SESSION_SECRET
createdb observatoire && createdb observatoire_shadow && createdb observatoire_test
npm install
npx prisma migrate dev            # applique les migrations
npm run user:create -- vous@exemple.fr "Prénom Nom" admin
npm run start:dev                 # http://localhost:3001/api
npm test                          # domaine et architecture
npm run test:e2e                  # de bout en bout, sur observatoire_test
```

Les sources, une fois l'API lancée :

```bash
cd backend
npm run territories:import -- 2026   # le découpage officiel des communes (COG INSEE)
npm run collect:parliament           # les textes déposés à l'Assemblée, à planifier chaque jour
```

La lecture à la demande n'a pas de commande : elle se fait quand une commune
s'ouvre, et se garde un jour.

L'administration, une fois l'API lancée :

```bash
cd admin && npm install
npm run dev                       # http://localhost:3000, /api relayé vers le port 3001
```

Le site public, une fois l'API lancée :

```bash
cd site && npm install
npm run dev                       # http://localhost:3002, rendu côté serveur
```

## Documentation

- `CONVENTIONS.md` : les règles de données, l'architecture de chaque
  application, les règles d'imports, les checklists.
- `docs/01-mvp.md` : vision, périmètre, parcours, critères d'acceptation.
- `docs/02-architecture.md` : chaîne de traitement, modèle de données, API.
- `docs/03-inventaire.md` : les jeux vérifiés et le protocole de collecte.
- `docs/04-feuille-de-route.md` : les lots, la définition de « prêt à
  publier », la gouvernance.
- `docs/05-alimentation.md` : comment l'outil se nourrit aujourd'hui
  (fichiers déposés, collecte du Parlement, lecture à la demande, miroir),
  et ce que dit chaque étiquette.

Les documents 01 à 04 sont le cahier des charges de référence ; le 05 décrit
le code tel qu'il est.

## Licences

- **Le code** : [AGPL-3.0](LICENSE). Un service en ligne qui reprend ce code
  publie ses modifications.
- **Le contenu de l'observatoire** (fiches, définitions, descriptions, liens,
  résumés, rapports, historique) : [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).
- **Les données des producteurs** gardent leur licence, donnée avec chaque
  valeur ; **les citations des partis** relèvent du droit de courte citation.

## Branches

`main` : déployée automatiquement · `dev` : intégration
