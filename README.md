# Observatoire citoyen des politiques publiques

Rendre lisibles les statistiques publiques existantes et rattacher aux mêmes
sujets les mesures publiées par les partis. L'observatoire montre l'état,
l'évolution et les disparités territoriales d'un indicateur, puis les
propositions qui s'y rapportent, côte à côte. Il ne note pas, ne classe pas et
ne conclut pas.

Douze piliers : agriculture et alimentation, santé, éducation et recherche,
énergie, logement, transports et infrastructures, travail, économie et
industrie, protection sociale, sécurité, justice et défense, environnement et
ressources, institutions et services publics, culture, sports et associations.
Le lancement se fait jeu de données vérifié par jeu de données vérifié.

## Le dépôt

```
site/      ce que lit le public, rendu côté serveur (à venir)
           TanStack Start · Tailwind v4
admin/     l'administration de l'équipe, rendue dans le navigateur
           React 19 · TanStack Router · TanStack Query · react-hook-form · zod · Tailwind v4
backend/   l'API publique et l'API d'administration
           NestJS 11 · Prisma 7 · PostgreSQL 17
docs/      le cahier des charges, l'architecture, l'inventaire, la feuille de route
scripts/   contrôles transverses (langue)
```

La frontière passe entre le public et l'équipe. Tout ce que lit le public
(accueil, piliers, fiches, valeurs, historique) est rendu côté serveur, pour
être trouvé et partagé. L'administration ne sert qu'à l'équipe connectée, et
partage l'origine de l'API : pas de CORS, cookie de session réservé à
`/api/admin`.

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

L'administration, une fois l'API lancée :

```bash
cd admin && npm install
npm run dev                       # http://localhost:3000, /api relayé vers le port 3001
```

Le site public (`site/`, port 3002) n'est pas encore généré.

## Documentation

- `CONVENTIONS.md` : les règles de données, l'architecture de chaque
  application, les règles d'imports, les checklists.
- `docs/01-mvp.md` : vision, périmètre, parcours, critères d'acceptation.
- `docs/02-architecture.md` : chaîne de traitement, modèle de données, API.
- `docs/03-inventaire.md` : les jeux vérifiés et le protocole de collecte.
- `docs/04-feuille-de-route.md` : les lots, la définition de « prêt à
  publier », la gouvernance.

## Licences

- **Le code** : [AGPL-3.0](LICENSE). Un service en ligne qui reprend ce code
  publie ses modifications.
- **Le contenu de l'observatoire** (fiches, définitions, descriptions, liens,
  résumés, rapports, historique) : [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).
- **Les données des producteurs** gardent leur licence, donnée avec chaque
  valeur ; **les citations des partis** relèvent du droit de courte citation.

## Branches

`main` : déployée automatiquement · `dev` : intégration
