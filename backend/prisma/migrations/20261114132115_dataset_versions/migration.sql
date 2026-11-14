-- CreateEnum
CREATE TYPE "VersionState" AS ENUM ('draft', 'in_review', 'published', 'rejected', 'superseded');

-- CreateEnum
CREATE TYPE "SourceFormat" AS ENUM ('csv', 'xlsx');

-- CreateEnum
CREATE TYPE "ImportState" AS ENUM ('uploaded');

-- CreateTable
CREATE TABLE "dataset_versions" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "vintage" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "state" "VersionState" NOT NULL DEFAULT 'draft',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "format" "SourceFormat" NOT NULL,
    "sheetNames" TEXT[],
    "sheet" TEXT,
    "headerRow" INTEGER NOT NULL DEFAULT 1,
    "rowCount" INTEGER NOT NULL,
    "state" "ImportState" NOT NULL DEFAULT 'uploaded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_rows" (
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "cells" JSONB NOT NULL,

    CONSTRAINT "raw_rows_pkey" PRIMARY KEY ("jobId","rowNumber")
);

-- CreateIndex
CREATE UNIQUE INDEX "dataset_versions_datasetId_fileHash_key" ON "dataset_versions"("datasetId", "fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "import_jobs_versionId_key" ON "import_jobs"("versionId");

-- AddForeignKey
ALTER TABLE "dataset_versions" ADD CONSTRAINT "dataset_versions_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "source_datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_versions" ADD CONSTRAINT "dataset_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "dataset_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_rows" ADD CONSTRAINT "raw_rows_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
