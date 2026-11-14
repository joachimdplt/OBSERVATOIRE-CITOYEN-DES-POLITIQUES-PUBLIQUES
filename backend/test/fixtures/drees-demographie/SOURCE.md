# Démographie des médecins (DREES) : extrait construit pour les tests

Classeur **construit pour les tests**, à la forme exacte du fichier de la DREES
« La démographie des professionnels de santé depuis 2012 », pièce jointe
`medecins_rpps_2012_2026_xlsx`, publiée le 2 juillet 2026 sous Licence Ouverte
v2.0 :
https://data.drees.solidarites-sante.gouv.fr/explore/dataset/la-demographie-des-professionnels-de-sante-depuis-2012/information/

- Onglet « Effectifs » : mêmes colonnes que l'original (`territoire`, `region`,
  `departement`, `specialites_agregees`, `specialites`, `exercice`,
  `tranche_age`, `sexe`, `effectif_AAAA`), réduites à 2025 et 2026.
- Onglet « Ages moyens » : mêmes colonnes, `am_AAAA`.
- Les valeurs sont inventées. Les marques sont celles de la DREES : « ND »
  pour moins de 10 professionnels, « . » pour aucun professionnel dénombré ;
  « 000-Ensemble » pour un total.
