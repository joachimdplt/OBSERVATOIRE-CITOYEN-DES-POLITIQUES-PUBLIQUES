-- L'onglet lu fait partie de l'identité d'une version : un classeur de la DREES
-- porte les effectifs et les âges moyens d'une même année, dans deux onglets.
ALTER TABLE "dataset_versions" ADD COLUMN "sheet" TEXT NOT NULL DEFAULT '';

UPDATE "dataset_versions" v
SET "sheet" = COALESCE(j."sheet", '')
FROM "import_jobs" j
WHERE j."versionId" = v."id";

-- L'onglet ne se réécrit pas plus que le fichier.
DROP TRIGGER dataset_version_file_never_rewritten ON dataset_versions;
CREATE TRIGGER dataset_version_file_never_rewritten
  BEFORE UPDATE OF "datasetId", "fileName", "fileHash", "fileSize", "fileUrl", "vintage", "collectedAt", "sheet"
  ON dataset_versions
  FOR EACH ROW EXECUTE FUNCTION refuse_raw_rewrite();

DROP INDEX "dataset_versions_datasetId_fileHash_vintage_key";
CREATE UNIQUE INDEX "dataset_versions_datasetId_fileHash_vintage_sheet_key" ON "dataset_versions"("datasetId", "fileHash", "vintage", "sheet");
