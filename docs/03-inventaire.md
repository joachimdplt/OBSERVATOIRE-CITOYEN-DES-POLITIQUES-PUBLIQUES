# 03 · Inventaire des données publiques

Catalogue initial exploitable et protocole de collecte, état au 14 novembre
2026.

> Principe directeur : partir des statistiques publiques disponibles, les
> rendre lisibles et les relier aux mesures politiques.

## Jeux vérifiés et premiers indicateurs

| Domaine | Indicateur / donnée | Granularité et précaution |
|---|---|---|
| Santé | 367 300 lits d'hospitalisation complète fin 2024 (arrondi DREES). | France, ensemble des établissements ; ne pas confondre avec les places d'hospitalisation partielle. |
| Santé | APL généralistes : moyenne 3,3 consultations/visites accessibles par habitant standardisé en 2024. | Commune ; indicateur d'accès, pas un nombre de médecins manquants. |
| Santé | SAE : lits de soins critiques, activité, personnels, équipements. | Établissement/territoire selon fichier ; vérifier la nomenclature. |
| Éducation | 1,1 million d'écoliers en REP et REP+ à la rentrée 2025. | Écoliers du premier degré ; pas tous les élèves de France. |
| Éducation | Moyenne de 21,1 élèves par classe élémentaire à la rentrée 2025. | Moyenne nationale ; les distributions REP/REP+ exigent le tableau dédié. |
| Éducation | RERS 2026 : 206 fiches dont établissements, personnels, budget et coûts. | Téléchargements tableur ; privilégier les fichiers sources plutôt que le PDF. |

## Sources officielles consultées

- DREES, Établissements de santé en 2024 :
  <https://www.drees.solidarites-sante.gouv.fr/publications-communique-de-presse-documents-de-reference/panoramas-de-la-drees/260520-Etablissements-de-sant%C3%A9-en-2024>
- DREES, SAE / lits de soins critiques :
  <https://data.drees.solidarites-sante.gouv.fr/explore/dataset/lits-de-reanimation-de-soins-intensifs-et-de-surveillance-continue-en-france0/information/>
- DREES, APL des professionnels de santé :
  <https://data.drees.solidarites-sante.gouv.fr/explore/dataset/530_l-accessibilite-potentielle-localisee-apl/>
- DEPP, Repères et références statistiques 2026 :
  <https://www.education.gouv.fr/depp/reperes-et-references-statistiques-2026-505320>
- DEPP, L'Éducation nationale en chiffres 2026 :
  <https://www.education.gouv.fr/depp/l-education-nationale-en-chiffres-edition-2026-505326>
- DEPP, Séries chronologiques :
  <https://www.education.gouv.fr/depp/series-chronologiques-de-donnees-statistiques-sur-le-systeme-educatif-12530>

## Extension du catalogue par pilier

- **Agriculture** : Agreste ; exploitations, surfaces, emplois, prix et
  revenus selon les jeux disponibles.
- **Énergie** : SDES/RTE ; production, capacités, consommation, émissions
  selon périmètre.
- **Logement** : SDES/SNE ; parc social, demandes, attributions, mises en
  chantier.
- **Transport** : SDES et opérateurs publics ; réseaux, fréquentation,
  service.
- **Travail et économie** : INSEE/DARES ; emploi, chômage, salaires,
  entreprises.
- **Protection sociale** : DREES/CNAF/CNAV ; bénéficiaires, dépenses et
  prestations.
- **Justice et sécurité** : statistiques ministérielles ; population
  détenue, capacités, effectifs.
- **Environnement** : SDES/OFB ; émissions, biodiversité, eau et déchets.
- **Institutions** : DGAFP/INSEE ; effectifs publics, ETP, rémunérations.
- **Culture et sport** : DEPS/INJEP ; équipements, fréquentation et
  financements.

## Protocole de collecte

1. Sélectionner le jeu officiel et vérifier licence, méthode, millésime et
   couverture.
2. Importer le fichier ou l'API brut sans écraser l'ancienne version.
3. Créer les définitions d'indicateurs, unités et géographies ; conserver les
   codes du producteur.
4. Contrôler valeurs manquantes, changements de nomenclature, doublons et
   ruptures de série.
5. Valider et publier avec lien vers le producteur ; ajouter ensuite les
   mesures politiques liées.
6. Réviser chaque année ou à la publication d'un nouveau millésime ; ne
   jamais annoncer une actualisation inexistante.

## Chiffres jamais déduits

Le nombre de lits « manquants », le nombre de médecins à recruter, les
besoins optimaux en enseignants ou le coût complet d'un nouveau service ne
sont pas déduits d'une moyenne nationale. Ils sont affichés seulement
lorsqu'une source publie explicitement le besoin, la méthode et le
périmètre. Les indicateurs descriptifs restent utiles sans ce calcul.
