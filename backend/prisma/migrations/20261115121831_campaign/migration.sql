-- CreateEnum
CREATE TYPE "CampaignSourceKind" AS ENUM ('feed', 'method', 'consultation');

-- CreateTable
CREATE TABLE "campaign_sources" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "kind" "CampaignSourceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_items" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "excerpt" TEXT,
    "event" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_snapshots" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passages" JSONB NOT NULL,
    "figures" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_sources_candidateId_url_key" ON "campaign_sources"("candidateId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_items_url_key" ON "campaign_items"("url");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_snapshots_sourceId_contentHash_key" ON "campaign_snapshots"("sourceId", "contentHash");

-- AddForeignKey
ALTER TABLE "campaign_sources" ADD CONSTRAINT "campaign_sources_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_sources" ADD CONSTRAINT "campaign_sources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "campaign_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_items" ADD CONSTRAINT "campaign_items_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_snapshots" ADD CONSTRAINT "campaign_snapshots_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "campaign_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

