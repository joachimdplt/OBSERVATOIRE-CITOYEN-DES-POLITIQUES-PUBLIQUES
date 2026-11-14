-- DropIndex
DROP INDEX "dataset_versions_datasetId_fileHash_key";

-- CreateIndex
CREATE UNIQUE INDEX "dataset_versions_datasetId_fileHash_vintage_key" ON "dataset_versions"("datasetId", "fileHash", "vintage");


-- Un jeu a une version visible du public par millésime, pas une seule en
-- tout : publier l'APL 2024 ne retire pas l'APL 2023, et l'évolution reste
-- lisible. Une nouvelle version d'un même millésime remplace la précédente.
DROP INDEX dataset_versions_one_public;
CREATE UNIQUE INDEX dataset_versions_one_public_per_vintage
  ON dataset_versions ("datasetId", vintage) WHERE state IN ('published', 'preprint');
