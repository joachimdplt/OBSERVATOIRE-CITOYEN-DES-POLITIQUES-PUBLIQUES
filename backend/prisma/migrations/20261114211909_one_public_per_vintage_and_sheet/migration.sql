-- Une version visible du public par millésime et par onglet : les effectifs
-- et les âges moyens des médecins viennent de deux onglets du même classeur,
-- pour la même année, et se lisent ensemble.
DROP INDEX dataset_versions_one_public_per_vintage;
CREATE UNIQUE INDEX dataset_versions_one_public_per_vintage
  ON dataset_versions ("datasetId", vintage, sheet) WHERE state IN ('published', 'preprint');
