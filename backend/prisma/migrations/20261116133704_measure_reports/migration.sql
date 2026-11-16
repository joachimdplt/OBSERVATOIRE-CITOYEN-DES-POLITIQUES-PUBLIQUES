-- CreateTable
CREATE TABLE "measure_reports" (
    "id" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" JSONB NOT NULL,
    "html" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "measure_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "measure_reports_measuredAt_idx" ON "measure_reports"("measuredAt");

-- AddForeignKey
ALTER TABLE "measure_reports" ADD CONSTRAINT "measure_reports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Une mesure archivée ne se modifie pas et ne s'efface pas.
CREATE FUNCTION measure_report_never_rewritten() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Une mesure archivée ne se modifie pas et ne s''efface pas : recalculez pour en ajouter une.'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER measure_report_never_rewritten
  BEFORE UPDATE OR DELETE ON "measure_reports"
  FOR EACH ROW EXECUTE FUNCTION measure_report_never_rewritten();
