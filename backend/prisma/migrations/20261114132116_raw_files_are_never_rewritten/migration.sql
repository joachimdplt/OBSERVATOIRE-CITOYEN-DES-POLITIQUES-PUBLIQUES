-- Le fichier d'une version et les lignes lues ne se réécrivent pas : ils sont
-- la preuve de ce que le producteur a publié. Corriger, c'est déposer une
-- nouvelle version.
CREATE FUNCTION refuse_raw_rewrite() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Un fichier déposé et ses lignes lues ne se réécrivent pas : déposez une nouvelle version.'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER raw_rows_never_rewritten
  BEFORE UPDATE OR DELETE ON raw_rows
  FOR EACH ROW EXECUTE FUNCTION refuse_raw_rewrite();

CREATE TRIGGER dataset_version_file_never_rewritten
  BEFORE UPDATE OF "datasetId", "fileName", "fileHash", "fileSize", "fileUrl", "vintage", "collectedAt"
  ON dataset_versions
  FOR EACH ROW EXECUTE FUNCTION refuse_raw_rewrite();

CREATE TRIGGER dataset_version_never_deleted
  BEFORE DELETE ON dataset_versions
  FOR EACH ROW EXECUTE FUNCTION refuse_raw_rewrite();
