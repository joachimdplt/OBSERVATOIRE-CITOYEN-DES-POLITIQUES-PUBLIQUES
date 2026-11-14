-- Une observation documentée a une valeur ; une absence (non documentée,
-- secret statistique, sans objet) n'en a jamais. Aucun zéro ne peut se
-- glisser à la place d'une absence.
ALTER TABLE observations
  ADD CONSTRAINT observation_value_matches_status
  CHECK ((status = 'documented') = (value IS NOT NULL));

-- Les observations d'une version ne bougent que tant qu'elle est un brouillon.
-- Soumise, publiée, rejetée ou remplacée, la version est figée.
CREATE FUNCTION refuse_observation_change_outside_draft() RETURNS trigger AS $$
DECLARE
  version_state "VersionState";
BEGIN
  SELECT state INTO version_state FROM dataset_versions
    WHERE id = COALESCE(NEW."versionId", OLD."versionId");
  IF version_state <> 'draft' THEN
    RAISE EXCEPTION 'Les observations d''une version qui n''est plus un brouillon ne changent plus.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER observations_frozen_outside_draft
  BEFORE INSERT OR UPDATE OR DELETE ON observations
  FOR EACH ROW EXECUTE FUNCTION refuse_observation_change_outside_draft();
