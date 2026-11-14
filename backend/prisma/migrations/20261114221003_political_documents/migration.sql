-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('bill', 'government_bill', 'law', 'amendment', 'programme');

-- CreateEnum
CREATE TYPE "Chamber" AS ENUM ('national_assembly', 'senate');

-- CreateTable
CREATE TABLE "political_documents" (
    "id" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "number" TEXT,
    "chamber" "Chamber",
    "filedAt" DATE NOT NULL,
    "url" TEXT NOT NULL,
    "firstAuthor" TEXT NOT NULL,
    "authorGroup" TEXT,
    "authorGroupSource" TEXT,
    "progress" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "political_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measures" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_measures" (
    "sectionId" TEXT NOT NULL,
    "measureId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,

    CONSTRAINT "section_measures_pkey" PRIMARY KEY ("sectionId","measureId")
);

-- AddForeignKey
ALTER TABLE "political_documents" ADD CONSTRAINT "political_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measures" ADD CONSTRAINT "measures_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "political_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measures" ADD CONSTRAINT "measures_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_measures" ADD CONSTRAINT "section_measures_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "publication_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_measures" ADD CONSTRAINT "section_measures_measureId_fkey" FOREIGN KEY ("measureId") REFERENCES "measures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Une citation fait foi : ni elle, ni son article, ni son document ne se
-- réécrivent. Une erreur se corrige par une nouvelle mesure.
CREATE OR REPLACE FUNCTION measure_quote_never_rewritten() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Une mesure ne s''efface pas.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.quote IS DISTINCT FROM OLD.quote
     OR NEW.article IS DISTINCT FROM OLD.article
     OR NEW."documentId" IS DISTINCT FROM OLD."documentId" THEN
    RAISE EXCEPTION 'Une citation ne se réécrit pas : saisissez une nouvelle mesure.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER measure_quote_never_rewritten
  BEFORE UPDATE OR DELETE ON measures
  FOR EACH ROW EXECUTE FUNCTION measure_quote_never_rewritten();

CREATE TRIGGER political_document_never_deleted
  BEFORE DELETE ON political_documents
  FOR EACH ROW EXECUTE FUNCTION refuse_raw_rewrite();

-- Les mesures d'un maillon ne changent que dans un brouillon.
CREATE TRIGGER section_measures_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON section_measures
  FOR EACH ROW EXECUTE FUNCTION publication_parts_frozen_outside_draft();
