-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pillar" "Pillar" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_versions" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "state" "VersionState" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "publication_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_sections" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "publication_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_indicators" (
    "sectionId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,

    CONSTRAINT "section_indicators_pkey" PRIMARY KEY ("sectionId","indicatorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "publications_slug_key" ON "publications"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "publication_versions_publicationId_number_key" ON "publication_versions"("publicationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "publication_sections_versionId_position_key" ON "publication_sections"("versionId", "position");

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_versions" ADD CONSTRAINT "publication_versions_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_versions" ADD CONSTRAINT "publication_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_versions" ADD CONSTRAINT "publication_versions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_versions" ADD CONSTRAINT "publication_versions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_sections" ADD CONSTRAINT "publication_sections_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "publication_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_indicators" ADD CONSTRAINT "section_indicators_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "publication_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_indicators" ADD CONSTRAINT "section_indicators_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicator_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Le circuit d'une version de publication est celui d'une version de jeu :
-- brouillon, en relecture, prépubliée, publiée, remplacée ; quatre yeux pour
-- publier. La même fonction le tient.
CREATE TRIGGER publication_version_transition
  BEFORE UPDATE ON publication_versions
  FOR EACH ROW EXECUTE FUNCTION guard_version_transition();

-- Une seule version visible du public par publication.
CREATE UNIQUE INDEX publication_versions_one_public
  ON publication_versions ("publicationId") WHERE state IN ('published', 'preprint');

-- Hors brouillon, le texte d'une version ne change plus.
CREATE FUNCTION publication_text_frozen_outside_draft() RETURNS trigger AS $$
BEGIN
  IF OLD.state <> 'draft' AND (
       NEW.title IS DISTINCT FROM OLD.title
    OR NEW.summary IS DISTINCT FROM OLD.summary
    OR NEW.number IS DISTINCT FROM OLD.number
    OR NEW."publicationId" IS DISTINCT FROM OLD."publicationId"
  ) THEN
    RAISE EXCEPTION 'Le texte d''une publication ne change plus hors brouillon : ouvrez une nouvelle version.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER publication_text_frozen
  BEFORE UPDATE ON publication_versions
  FOR EACH ROW EXECUTE FUNCTION publication_text_frozen_outside_draft();

-- Les maillons et leurs indicateurs ne changent que dans un brouillon.
CREATE FUNCTION publication_parts_frozen_outside_draft() RETURNS trigger AS $$
DECLARE
  version_state "VersionState";
BEGIN
  IF TG_TABLE_NAME = 'publication_sections' THEN
    SELECT state INTO version_state FROM publication_versions
      WHERE id = COALESCE(NEW."versionId", OLD."versionId");
  ELSE
    SELECT v.state INTO version_state
      FROM publication_sections s JOIN publication_versions v ON v.id = s."versionId"
      WHERE s.id = COALESCE(NEW."sectionId", OLD."sectionId");
  END IF;
  IF version_state IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Les maillons d''une publication ne changent plus hors brouillon.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER publication_sections_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON publication_sections
  FOR EACH ROW EXECUTE FUNCTION publication_parts_frozen_outside_draft();
CREATE TRIGGER section_indicators_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON section_indicators
  FOR EACH ROW EXECUTE FUNCTION publication_parts_frozen_outside_draft();

-- Une version de publication ne s'efface pas, une publication non plus.
CREATE TRIGGER publication_version_never_deleted
  BEFORE DELETE ON publication_versions
  FOR EACH ROW EXECUTE FUNCTION refuse_raw_rewrite();
CREATE TRIGGER publication_never_deleted
  BEFORE DELETE ON publications
  FOR EACH ROW EXECUTE FUNCTION refuse_raw_rewrite();
