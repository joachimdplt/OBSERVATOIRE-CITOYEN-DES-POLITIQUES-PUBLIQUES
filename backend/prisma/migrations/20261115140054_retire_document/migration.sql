-- AlterTable
ALTER TABLE "political_documents" ADD COLUMN     "retiredAt" TIMESTAMP(3),
ADD COLUMN     "retiredById" TEXT,
ADD COLUMN     "retiredReason" TEXT;

-- AddForeignKey
ALTER TABLE "political_documents" ADD CONSTRAINT "political_documents_retiredById_fkey" FOREIGN KEY ("retiredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Un retrait dit qui et pourquoi.
ALTER TABLE "political_documents" ADD CONSTRAINT "political_document_retirement_signed"
  CHECK (("retiredAt" IS NULL AND "retiredById" IS NULL AND "retiredReason" IS NULL)
      OR ("retiredAt" IS NOT NULL AND "retiredById" IS NOT NULL
          AND length(trim("retiredReason")) > 0));

-- Un document ne se retire qu'une fois.
CREATE FUNCTION political_document_retired_once() RETURNS trigger AS $$
BEGIN
  IF OLD."retiredAt" IS NOT NULL AND (
       NEW."retiredAt" IS DISTINCT FROM OLD."retiredAt"
    OR NEW."retiredById" IS DISTINCT FROM OLD."retiredById"
    OR NEW."retiredReason" IS DISTINCT FROM OLD."retiredReason") THEN
    RAISE EXCEPTION 'Un document ne se retire qu''une fois.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER political_document_retired_once
  BEFORE UPDATE ON "political_documents"
  FOR EACH ROW EXECUTE FUNCTION political_document_retired_once();
