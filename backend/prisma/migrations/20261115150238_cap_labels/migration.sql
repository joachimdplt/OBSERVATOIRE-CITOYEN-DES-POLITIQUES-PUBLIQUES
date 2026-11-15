-- CreateEnum
CREATE TYPE "LabelOrigin" AS ENUM ('model', 'person');

-- CreateEnum
CREATE TYPE "LabelStatus" AS ENUM ('proposed', 'validated', 'rejected');

-- CreateTable
CREATE TABLE "cap_labels" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "capCode" TEXT NOT NULL,
    "origin" "LabelOrigin" NOT NULL,
    "score" DOUBLE PRECISION,
    "model" TEXT,
    "status" "LabelStatus" NOT NULL DEFAULT 'proposed',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "cap_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cap_labels_capCode_status_idx" ON "cap_labels"("capCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cap_labels_candidateId_documentUrl_heading_capCode_key" ON "cap_labels"("candidateId", "documentUrl", "heading", "capCode");

-- AddForeignKey
ALTER TABLE "cap_labels" ADD CONSTRAINT "cap_labels_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cap_labels" ADD CONSTRAINT "cap_labels_capCode_fkey" FOREIGN KEY ("capCode") REFERENCES "cap_topics"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cap_labels" ADD CONSTRAINT "cap_labels_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cap_labels" ADD CONSTRAINT "cap_labels_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Une décision dit qui et quand ; une relecture aussi, par une autre personne.
ALTER TABLE "cap_labels" ADD CONSTRAINT "cap_label_decision_signed"
  CHECK (("status" = 'proposed' AND "decidedById" IS NULL AND "decidedAt" IS NULL)
      OR ("status" <> 'proposed' AND "decidedById" IS NOT NULL AND "decidedAt" IS NOT NULL));
ALTER TABLE "cap_labels" ADD CONSTRAINT "cap_label_review_by_another"
  CHECK ("reviewedById" IS NULL
      OR ("reviewedAt" IS NOT NULL AND "decidedById" IS NOT NULL AND "reviewedById" <> "decidedById"));
