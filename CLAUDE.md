# Observatoire citoyen des politiques publiques

Lire `CONVENTIONS.md` avant toute modification. Sa section 1 (règles de
données) prime sur tout le reste.

## Le dépôt

- `site/` : ce que lit le public, rendu côté serveur (TanStack Start) ; l'API
  se lit par des fonctions serveur.
- `admin/` : l'administration de l'équipe, rendue dans le navigateur
  (React, TanStack Router et Query, react-hook-form, zod) ; atoms,
  molecules, organisms ; design du suivi de parc, monochrome.
- `backend/` : l'API NestJS, Prisma, PostgreSQL ; `/api/public/*` et
  `/api/admin/*`.
- `docs/` : le cahier des charges de référence (01 à 04).

## Les règles qui ne se négocient pas

- Une donnée absente s'affiche « non documenté », jamais zéro.
- Aucun chiffre déduit : pas de besoin, de manque, de coût ou d'écart que la
  source ne publie pas.
- Aucun score, classement, verdict ni couleur partisane.
- Toute valeur affichée porte sa provenance (producteur, jeu, millésime,
  unité, périmètre).
- Aucune conversion d'unité hors de `domain/units.ts`.
- Une mesure politique s'affiche par sa citation exacte et son document,
  avant son libellé ; le libellé reformule sans qualifier.
- Aucun mot de verdict sur une formation (mensonge, irréaliste, crédible…).
- Le fichier brut d'un document politique ne sort jamais par une route
  publique : on publie l'extrait et le lien.
- Une correction crée une version ; la procédure de rectification est la
  même pour toutes les formations.

Le détail juridique (diffamation, droit d'auteur, droit de réponse, égalité
de traitement, données personnelles) est dans `CONVENTIONS.md`, sections 1.5
à 1.9.

## Travail

- Code en anglais, interface et commentaires en français.
- Après tout renommage : `node scripts/check-language.mjs`.
- Ports de développement fixés : API 3001, administration 3000, site 3002.
  Ne pas les changer.
- Commits en anglais, phrase décrivant le changement pour l'utilisateur,
  sans ligne `Co-Authored-By`.
- Pas de tiret long, pas de « Ce qui… / Ce qu'on… » dans les textes.
