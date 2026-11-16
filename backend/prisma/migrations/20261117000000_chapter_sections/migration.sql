-- CreateTable
CREATE TABLE "chapter_sections" (
    "id" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chapter_sections_documentUrl_page_heading_key" ON "chapter_sections"("documentUrl", "page", "heading");

-- AddForeignKey
ALTER TABLE "chapter_sections" ADD CONSTRAINT "chapter_sections_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

