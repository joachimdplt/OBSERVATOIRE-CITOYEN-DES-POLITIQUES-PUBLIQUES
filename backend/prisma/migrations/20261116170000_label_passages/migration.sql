-- DropIndex
DROP INDEX "cap_labels_candidateId_documentUrl_heading_capCode_key";

-- AlterTable
ALTER TABLE "cap_labels" ADD COLUMN     "positions" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'chapter';

-- CreateIndex
CREATE UNIQUE INDEX "cap_labels_candidateId_documentUrl_heading_capCode_unit_key" ON "cap_labels"("candidateId", "documentUrl", "heading", "capCode", "unit");

