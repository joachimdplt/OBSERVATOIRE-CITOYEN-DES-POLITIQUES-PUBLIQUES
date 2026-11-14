-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('documented', 'not_documented', 'confidential', 'not_applicable');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('blocking', 'info');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ImportState" ADD VALUE 'described';
ALTER TYPE "ImportState" ADD VALUE 'needs_correction';
ALTER TYPE "ImportState" ADD VALUE 'validated';

-- AlterTable
ALTER TABLE "import_jobs" ADD COLUMN     "description" JSONB,
ADD COLUMN     "validatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "import_anomalies" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER,
    "column" TEXT,
    "kind" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "import_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" DECIMAL(20,6),
    "status" "ObservationStatus" NOT NULL,
    "versionId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_anomalies_jobId_idx" ON "import_anomalies"("jobId");

-- CreateIndex
CREATE INDEX "observations_indicatorId_versionId_idx" ON "observations"("indicatorId", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "observations_indicatorId_territoryId_period_versionId_key" ON "observations"("indicatorId", "territoryId", "period", "versionId");

-- AddForeignKey
ALTER TABLE "import_anomalies" ADD CONSTRAINT "import_anomalies_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicator_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "dataset_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
