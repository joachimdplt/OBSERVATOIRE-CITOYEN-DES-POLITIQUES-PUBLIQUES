-- CreateEnum
CREATE TYPE "SitePageKind" AS ENUM ('programme', 'agenda', 'news', 'method', 'consultation', 'other');

-- AlterEnum
ALTER TYPE "CampaignSourceKind" ADD VALUE 'site';

-- CreateTable
CREATE TABLE "site_pages" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "SitePageKind" NOT NULL,
    "depth" INTEGER NOT NULL,
    "textLength" INTEGER NOT NULL,
    "dates" TEXT[],
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_pages_sourceId_url_key" ON "site_pages"("sourceId", "url");

-- AddForeignKey
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "campaign_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

