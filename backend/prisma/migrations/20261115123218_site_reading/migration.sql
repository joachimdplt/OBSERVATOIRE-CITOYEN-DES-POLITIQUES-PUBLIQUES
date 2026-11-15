-- CreateEnum
CREATE TYPE "SitePageStatus" AS ENUM ('pending', 'read', 'failed');

-- AlterTable
ALTER TABLE "site_pages" ADD COLUMN     "error" TEXT,
ADD COLUMN     "lastmod" TIMESTAMP(3),
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "status" "SitePageStatus" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "site_page_texts" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passages" JSONB NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_page_texts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_page_texts_pageId_contentHash_key" ON "site_page_texts"("pageId", "contentHash");

-- CreateIndex
CREATE INDEX "site_pages_status_lastmod_idx" ON "site_pages"("status", "lastmod");

-- AddForeignKey
ALTER TABLE "site_page_texts" ADD CONSTRAINT "site_page_texts_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "site_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

