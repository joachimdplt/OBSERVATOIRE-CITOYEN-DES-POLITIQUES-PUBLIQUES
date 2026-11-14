-- Un territoire d'un millésime chargé ne se modifie ni ne se supprime : des
-- observations publiées s'y rattachent. Un nouveau découpage arrive comme un
-- nouveau millésime.
CREATE FUNCTION refuse_territory_rewrite() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Un territoire chargé ne se réécrit pas : chargez un nouveau millésime du COG.'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER territories_never_rewritten
  BEFORE UPDATE OR DELETE ON territories
  FOR EACH ROW EXECUTE FUNCTION refuse_territory_rewrite();

CREATE TRIGGER territory_vintages_never_rewritten
  BEFORE UPDATE OR DELETE ON territory_vintages
  FOR EACH ROW EXECUTE FUNCTION refuse_territory_rewrite();
