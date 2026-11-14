-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('submitted', 'approved', 'rejected', 'superseded');

-- AlterEnum
BEGIN;
CREATE TYPE "VersionState_new" AS ENUM ('draft', 'in_review', 'published', 'superseded');
ALTER TABLE "public"."dataset_versions" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "dataset_versions" ALTER COLUMN "state" TYPE "VersionState_new" USING ("state"::text::"VersionState_new");
ALTER TYPE "VersionState" RENAME TO "VersionState_old";
ALTER TYPE "VersionState_new" RENAME TO "VersionState";
DROP TYPE "public"."VersionState_old";
ALTER TABLE "dataset_versions" ALTER COLUMN "state" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "dataset_versions" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedById" TEXT;

-- CreateTable
CREATE TABLE "review_events" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "justification" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_events_subjectType_subjectId_idx" ON "review_events"("subjectType", "subjectId");

-- AddForeignKey
ALTER TABLE "dataset_versions" ADD CONSTRAINT "dataset_versions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_versions" ADD CONSTRAINT "dataset_versions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

