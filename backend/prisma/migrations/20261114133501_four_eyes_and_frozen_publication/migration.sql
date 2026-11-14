-- Le circuit d'une version, tenu par la base quoi que fasse l'API :
--   draft → in_review          soumise
--   in_review → draft          rejetée, à reprendre
--   in_review → published      approuvée par une autre personne que celle qui a soumis
--   published → superseded     remplacée par une version publiée plus récente
-- Toute autre transition est refusée. Une version publiée ne change plus,
-- sauf pour être remplacée ; une version remplacée ne change plus du tout.
CREATE FUNCTION guard_version_transition() RETURNS trigger AS $$
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
       (OLD.state = 'draft' AND NEW.state = 'in_review')
    OR (OLD.state = 'in_review' AND NEW.state IN ('draft', 'published'))
    OR (OLD.state = 'published' AND NEW.state = 'superseded')
  ) THEN
    RAISE EXCEPTION 'Transition refusée : % → %.', OLD.state, NEW.state
      USING ERRCODE = 'check_violation';
  END IF;

  -- Quatre yeux : la personne qui approuve n'est jamais celle qui a soumis.
  IF NEW.state = 'published' AND OLD.state = 'in_review' AND (
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

CREATE TRIGGER dataset_version_transition
  BEFORE UPDATE ON dataset_versions
  FOR EACH ROW EXECUTE FUNCTION guard_version_transition();

-- Une seule version publiée par jeu à la fois.
CREATE UNIQUE INDEX dataset_versions_one_published
  ON dataset_versions ("datasetId") WHERE state = 'published';

-- Une trace de revue ne se modifie ni ne se supprime.
CREATE FUNCTION refuse_review_event_rewrite() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Une trace de revue ne se modifie ni ne se supprime.'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_events_never_rewritten
  BEFORE UPDATE OR DELETE ON review_events
  FOR EACH ROW EXECUTE FUNCTION refuse_review_event_rewrite();
