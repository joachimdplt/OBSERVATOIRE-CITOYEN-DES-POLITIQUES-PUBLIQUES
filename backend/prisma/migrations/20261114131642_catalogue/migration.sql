-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('statistical_service', 'national_institute', 'public_operator', 'other');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('annual', 'quarterly', 'monthly', 'irregular', 'one_off');

-- CreateEnum
CREATE TYPE "Pillar" AS ENUM ('agriculture_food', 'health', 'education_research', 'energy', 'housing', 'transport_infrastructure', 'labour_economy_industry', 'social_protection', 'security_justice_defence', 'environment_resources', 'institutions_public_services', 'culture_sports_associations');

-- CreateEnum
CREATE TYPE "Aggregation" AS ENUM ('sum', 'mean');

-- CreateTable
CREATE TABLE "data_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "kind" "ProviderKind" NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_datasets" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "producerRef" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicator_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "pillar" "Pillar" NOT NULL,
    "allowedAggregations" "Aggregation"[],
    "method" TEXT NOT NULL,
    "limits" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicator_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_providers_acronym_key" ON "data_providers"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "source_datasets_providerId_producerRef_key" ON "source_datasets"("providerId", "producerRef");

-- CreateIndex
CREATE UNIQUE INDEX "indicator_definitions_code_key" ON "indicator_definitions"("code");

-- AddForeignKey
ALTER TABLE "data_providers" ADD CONSTRAINT "data_providers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_datasets" ADD CONSTRAINT "source_datasets_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "data_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_datasets" ADD CONSTRAINT "source_datasets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_definitions" ADD CONSTRAINT "indicator_definitions_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "source_datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_definitions" ADD CONSTRAINT "indicator_definitions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
