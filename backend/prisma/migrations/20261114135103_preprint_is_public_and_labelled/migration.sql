-- La prépublication : une version publiée par son seul auteur, visible du
-- public avec son étiquette, en attente de relecture. Les quatre yeux restent
-- exigés pour l'état « published ».
--
--   draft → in_review | preprint
--   in_review → draft | published
--   preprint → published (relue par une autre personne) | superseded
--   published → superseded
CREATE OR REPLACE FUNCTION guard_version_transition() RETURNS trigger AS $$
BEGIN
  IF OLD.state = 'superseded' THEN
    RAISE EXCEPTION 'Une version remplacée ne change plus.' USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.state = 'published' AND NOT (
    NEW.state = 'superseded' AND (to_jsonb(NEW) - 'state') = (to_jsonb(OLD) - 'state')
  ) THEN
    RAISE EXCEPTION 'Une version publiée ne change plus : déposez une nouvelle version.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.state IS DISTINCT FROM OLD.state AND NOT (
       (OLD.state = 'draft' AND NEW.state IN ('in_review', 'preprint'))
    OR (OLD.state = 'in_review' AND NEW.state IN ('draft', 'published'))
    OR (OLD.state = 'preprint' AND NEW.state IN ('published', 'superseded'))
    OR (OLD.state = 'published' AND NEW.state = 'superseded')
  ) THEN
    RAISE EXCEPTION 'Transition refusée : % → %.', OLD.state, NEW.state
      USING ERRCODE = 'check_violation';
  END IF;

  -- Quatre yeux : la personne qui approuve n'est jamais celle qui a soumis ou prépublié.
  IF NEW.state = 'published' AND OLD.state IN ('in_review', 'preprint') AND (
       NEW."submittedById" IS NULL
    OR NEW."reviewedById" IS NULL
    OR NEW."reviewedById" = NEW."submittedById"
  ) THEN
    RAISE EXCEPTION 'Une version ne se publie que relue par une autre personne que celle qui l''a soumise.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Une seule version visible du public par jeu : publiée ou prépubliée.
DROP INDEX dataset_versions_one_published;
CREATE UNIQUE INDEX dataset_versions_one_public
  ON dataset_versions ("datasetId") WHERE state IN ('published', 'preprint');
