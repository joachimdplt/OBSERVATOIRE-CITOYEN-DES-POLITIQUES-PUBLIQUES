-- Une source se retire d'un indicateur sans s'effacer : la ligne reste, avec
-- qui l'a retirée, quand et pourquoi.
ALTER TABLE "indicator_sources" DROP CONSTRAINT "indicator_sources_pkey",
ADD COLUMN     "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN     "retiredAt" TIMESTAMP(3),
ADD COLUMN     "retiredById" TEXT,
ADD COLUMN     "retiredReason" TEXT,
ADD CONSTRAINT "indicator_sources_pkey" PRIMARY KEY ("id");
ALTER TABLE "indicator_sources" ALTER COLUMN "id" DROP DEFAULT;

CREATE INDEX "indicator_sources_indicatorId_datasetId_idx" ON "indicator_sources"("indicatorId", "datasetId");

ALTER TABLE "indicator_sources" ADD CONSTRAINT "indicator_sources_retiredById_fkey" FOREIGN KEY ("retiredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Un seul lien actif par indicateur et par jeu ; un lien retiré peut être
-- suivi d'un nouveau lien, l'ancien reste dans l'historique.
CREATE UNIQUE INDEX "indicator_sources_one_active"
  ON "indicator_sources"("indicatorId", "datasetId")
  WHERE "retiredAt" IS NULL;

-- Un retrait dit qui et pourquoi.
ALTER TABLE "indicator_sources" ADD CONSTRAINT "indicator_source_retirement_signed"
  CHECK (("retiredAt" IS NULL AND "retiredById" IS NULL AND "retiredReason" IS NULL)
      OR ("retiredAt" IS NOT NULL AND "retiredById" IS NOT NULL
          AND length(trim("retiredReason")) > 0));

-- Un lien ne s'efface pas, ne se réécrit pas, et ne se retire qu'une fois.
CREATE FUNCTION indicator_source_never_rewritten() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Un lien entre un indicateur et une source ne s''efface pas : il se retire.';
  END IF;
  IF OLD."retiredAt" IS NOT NULL
     OR NEW."id" <> OLD."id"
     OR NEW."indicatorId" <> OLD."indicatorId"
     OR NEW."datasetId" <> OLD."datasetId"
     OR NEW."createdById" <> OLD."createdById"
     OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION 'Un lien entre un indicateur et une source ne se réécrit pas ; seul son retrait s''ajoute, une fois.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER indicator_source_never_rewritten
  BEFORE UPDATE OR DELETE ON "indicator_sources"
  FOR EACH ROW EXECUTE FUNCTION indicator_source_never_rewritten();
