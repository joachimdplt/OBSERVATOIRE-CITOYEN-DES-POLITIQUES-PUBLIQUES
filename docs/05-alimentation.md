# 05 · Comment l'observatoire se nourrit

État au 14 novembre 2026. Ce document décrit le fonctionnement réel du code ;
les documents 01 à 04 restent le cahier des charges de référence.

> Principe : l'outil va chercher lui-même les sources officielles, les garde
> telles qu'il les a reçues, et dit toujours comment il les a obtenues. Un
> humain relit ce qui se publie ; ce qui n'est pas relu le dit.

## Deux natures d'objets

- **Les données sont un matériau.** Un fichier de la DREES, de l'INSEE, d'une
  ARS est importé, contrôlé contre le fichier du producteur, puis
  « vérifié par son auteur », puis « vérifié par deux personnes ». Il n'est
  pas présenté comme une publication de l'observatoire.
- **Les publications (articles) sont ce que l'observatoire publie.** Un
  article nomme un enjeu (« Accès aux médecins généralistes »), le découpe en
  parties, choisit pour chacune des indicateurs avec la raison du choix, et y
  rattache les textes politiques. Il est signé, versionné, prépublié puis
  relu par une autre personne que son auteur, comme un article de revue.

## Quatre façons d'entrer dans la base

### 1. Le fichier déposé (données lourdes, cartes)

Pour un fichier qu'il faut lire en entier, par exemple pour colorer la carte
de France commune par commune.

1. **Dépôt** : le fichier est gardé tel quel, avec son adresse, sa date de
   collecte et son empreinte SHA-256 ; chaque ligne brute est conservée avec
   son numéro.
2. **Description** : où lire le territoire, la période, chaque indicateur ;
   le séparateur décimal ; les marques du producteur (« ND » secret,
   « . » zéro, « NC » sans objet) ; les filtres de lignes pour un fichier qui
   croise plusieurs dimensions ; un code écrit avec son libellé
   (« 045 -Loiret »).
3. **Contrôle** : chaque ligne est lue ; un code inconnu du découpage officiel
   (COG) déclaré, une valeur illisible, un doublon bloquent.
4. **Vérification** : par son auteur, puis par une seconde personne.

Les classeurs se lisent en flux, onglet par onglet (le fichier des médecins
de la DREES, 73 Mo et 313 000 lignes, se lit en 7 secondes).

### 2. La collecte des textes déposés au Parlement

Pour les textes politiques. `npm run collect:parliament`, ou le bouton de
l'administration ; prévu pour tourner chaque jour.

- **Source** : les données ouvertes de l'Assemblée nationale (dossiers
  législatifs, historique des groupes des députés, texte intégral de chaque
  dépôt).
- **Veille** : chaque article de l'observatoire porte ses termes surveillés
  (« déserts médicaux », « médecin traitant »…). Un texte dont le titre en
  porte un est retenu ; un terme retiré retire ses rattachements.
- **Ce qui entre** : le texte, son premier signataire, le groupe de celui-ci
  au jour du dépôt avec la source de l'information, et chaque article cité
  mot pour mot.
- **Ce qui s'affiche** : aussitôt, étiqueté « collecté automatiquement, non
  relu ». La machine n'écrit aucun libellé : l'article et sa citation, rien
  d'autre. Une personne en tire ensuite des mesures relues, avec un libellé
  neutre.
- **Un texte ne se collecte qu'une fois.** Une proposition venue du Sénat est
  laissée à la collecte du Sénat (à venir), pour garder son vrai auteur.

### 3. La lecture à la demande (autour de ce qu'on regarde)

Comme un jeu qui charge le décor autour du joueur. Quand une commune
s'ouvre, l'outil lit ses lignes chez le producteur, sans télécharger le
fichier entier.

- **Source** : l'API tabulaire de data.gouv.fr (par exemple la base
  communale de la délinquance enregistrée du ministère de l'Intérieur : 150
  lignes pour une commune, en une requête).
- **La façon de lire** une source s'écrit une fois (colonnes du territoire,
  de la période, du libellé, des valeurs ; marque du secret statistique) et
  se rejoue à chaque lecture.
- **La lecture est gardée telle que reçue**, avec sa date et la date de
  modification du fichier chez le producteur. Elle se réutilise un jour ;
  ensuite, l'outil demande au producteur si le fichier a changé, et relit
  seulement dans ce cas. Une lecture ne se réécrit ni ne s'efface.
- **Ce qui s'affiche** : chaque valeur telle que publiée, « lue
  automatiquement à la source le … », avec l'adresse des lignes d'origine.

### 4. Le miroir (à venir)

Pour les producteurs qui ne publient que de gros fichiers (les bases du
recensement de l'INSEE, en zip de 100 à 150 Mo). L'outil télécharge le
fichier une fois, en tâche de fond, et range ses lignes par commune dans une
base à côté ; la lecture à la demande lit ce miroir comme elle lit
data.gouv.fr. Un déclencheur vérifie la date de modification et l'empreinte
du fichier chez le producteur, et recharge le miroir quand il change.

## Les candidats et leurs programmes

L'élection suivie (la présidentielle 2027) s'inscrit avec son critère : toute
personne qui a déclaré publiquement sa candidature, d'après une source datée.
Chaque candidat porte la source de sa déclaration et l'état de son programme,
vérifié à la main à une date donnée : programme complet, documents partiels
(livrets, premier volet, contre-budget), ou rien de publié. L'accueil donne
ces trois comptes et la liste, avec le lien vers chaque programme. Au
14 novembre 2026 : 25 candidats déclarés, 3 programmes complets, 4 ensembles
de documents partiels, 18 sans rien de publié.

## La collecte des programmes et le rangement des enjeux

`npm run collect:programmes`, prévu pour tourner chaque jour.

- **Où lire** : l'équipe indique, pour chaque candidat, l'adresse de son
  programme : un PDF, une page, ou une table des matières avec le motif des
  pages à suivre (les 30 chapitres de L'Avenir en commun, les 15 thèmes du
  programme d'Édouard Philippe, les 8 livrets des Républicains).
- **Ce qui entre** : chaque page ou fichier, gardé tel que reçu sous son
  empreinte ; son texte découpé en passages, chacun sous sa rubrique, mot pour
  mot. Un site qui refuse la lecture automatique est lu sur sa copie de
  web.archive.org, et le lien affiché mène à cette copie.
- **Les changements** : une page dont le texte change entre comme un nouveau
  document ; seule la lecture la plus récente s'affiche, l'ancienne reste.
- **Les enjeux** : l'équipe nomme un enjeu (« Logement social ») et publie
  les termes qui le reconnaissent (« logement social », « logements
  sociaux », « HLM », « bailleurs sociaux »). Un passage qui contient un terme,
  en mots entiers, est rattaché à l'enjeu. Un terme ajouté ou retiré relit
  tous les programmes déjà collectés.
- **Le rangement** : la page « Enjeux » range les enjeux par le nombre de
  programmes où un terme apparaît, puis par le nombre de passages. Ce compte
  dit de quoi les textes parlent ; il ne dit ni ce qu'ils proposent ni ce
  qu'ils valent. Un programme sans passage trouvé est nommé : il peut traiter
  l'enjeu avec d'autres mots.

Au 15 novembre 2026 : 7 programmes (57 pages et fichiers, 4 472 passages),
48 enjeux sur les douze piliers.

## Les vidéos publiques des candidats

`npm run collect:videos`, prévu pour tourner chaque jour : le flux public
d'une chaîne ne donne que ses quinze dernières vidéos, et le collecteur garde
tout ce qu'il a vu.

- **Seulement des sources primaires** : le candidat parle, sans montage ni
  commentaire d'un tiers. Chaque chaîne suivie est celle que donne un site
  officiel (celui du candidat, de son parti, de l'institution), cité sur la
  page.
- **Trois sortes de chaînes, trois règles** :
  - la chaîne du candidat : chacune de ses vidéos lui revient ;
  - la chaîne de son parti : seulement les vidéos dont le titre nomme son
    candidat, jamais les propos d'un camp sur un autre ;
  - l'Assemblée nationale et le Sénat : les vidéos dont le titre nomme un
    candidat.
- **Le nom se lit complet** : « Philippe » est aussi un prénom, « Le Pen »
  un autre nom.
- **Écartées** : LCP et Public Sénat, qui diffusent aussi des magazines et
  des commentaires ; les chaînes des médias.
- **Non lus** : les vues et les notes des vidéos.

Au 15 novembre 2026 : 16 chaînes (5 de candidats, 9 de partis, 2
d'institutions) ; aucune chaîne n'est liée depuis les sites du Rassemblement
national et des Écologistes.

## Les étiquettes, du moins au plus relu

| Étiquette | Sens |
|---|---|
| Lu automatiquement à la source | lecture à la demande, telle que reçue |
| Collecté automatiquement, non relu | texte politique collecté, article cité mot pour mot |
| Vérifiée par son auteur | données contrôlées et vérifiées par une personne |
| Vérifiée par deux personnes | données relues par une seconde personne |
| Prépublication | article publié par son auteur, en attente de relecture |
| Publiée | article relu par une autre personne que son auteur |

## Ce que la base garantit

- Une ligne brute, une lecture, une citation ne se réécrivent jamais.
- Une version (de données ou d'article) ne s'efface pas ; hors brouillon,
  elle ne change plus.
- Rien ne passe à « publiée » sans une seconde personne.
- Une valeur est un nombre ou une catégorie, jamais les deux ; une absence
  n'a ni l'un ni l'autre.
