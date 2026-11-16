-- CreateEnum
CREATE TYPE "DecisionMode" AS ENUM ('person', 'assistant');

-- CreateEnum
CREATE TYPE "CheckVerdict" AS ENUM ('accepted', 'refused');

-- AlterTable
ALTER TABLE "cap_labels" ADD COLUMN     "decisionMode" "DecisionMode";

-- CreateTable
CREATE TABLE "label_checks" (
    "id" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "verdict" "CheckVerdict" NOT NULL,
    "checkedById" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "label_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "label_checks_labelId_idx" ON "label_checks"("labelId");

-- AddForeignKey
ALTER TABLE "label_checks" ADD CONSTRAINT "label_checks_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "cap_labels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_checks" ADD CONSTRAINT "label_checks_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Les 2 035 décisions prises le 15 et le 16 novembre 2026 l'ont été par un
-- assistant, sans relecture humaine, même signées du compte de l'équipe.
UPDATE "cap_labels" SET "decisionMode" = 'assistant' WHERE "decidedAt" IS NOT NULL;

-- Un verdict ne se modifie pas et ne s'efface pas : on en ajoute un autre.
CREATE FUNCTION label_check_never_rewritten() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Un verdict ne se modifie pas et ne s''efface pas : donnez un nouveau verdict.'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER label_check_never_rewritten
  BEFORE UPDATE OR DELETE ON "label_checks"
  FOR EACH ROW EXECUTE FUNCTION label_check_never_rewritten();
