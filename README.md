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
site/      la landing publique, rendue côté serveur
           TanStack Start (SSR, Nitro) · Tailwind v4
client/    l'application, rendue dans le navigateur
           React 19 · TanStack Router · TanStack Query · Zustand · Tailwind v4
backend/   l'API publique et l'API d'administration
           NestJS 11 · Prisma 7 · PostgreSQL 17
deploy/    Docker Compose, Caddy, déploiement par surveillance de branche
docs/      le cahier des charges, l'architecture, l'inventaire, la feuille de route
scripts/   contrôles transverses (langue)
```

### Une landing SSR, une application CSR

La landing est la seule page qui doit être lue par un moteur de recherche et
partagée sur un réseau social : elle est rendue côté serveur. Tout le reste
(explorateur, fiches, comparateur, administration) vit dans `client/`, une
application React servie en fichiers statiques et rendue dans le navigateur.
Ses boutons renvoient vers l'application.

```
observatoire.<domaine>          site/     SSR, Node
app.observatoire.<domaine>      client/   fichiers statiques
app.observatoire.<domaine>/api  backend/  même origine que l'application
```

L'application et l'API partagent une origine : pas de CORS, cookies de session
en `SameSite=Strict`. La landing appelle l'API par le réseau interne de Docker
quand elle affiche un chiffre publié.

Les deux fronts ne partagent aucun fichier. Un composant utile aux deux est
recopié, et les copies divergent sans dommage : la landing vend une idée,
l'application sert une consultation.

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

Les fronts ne sont pas encore générés : `client/` sur le port 3000, `site/`
sur le port 3002.

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
