-- AlterTable
ALTER TABLE "political_documents" ADD COLUMN     "fetchedAt" TIMESTAMP(3),
ADD COLUMN     "fileHash" TEXT,
ADD COLUMN     "programmeSourceId" TEXT;

-- CreateTable
CREATE TABLE "programme_sources" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "follow" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programme_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pillar" "Pillar" NOT NULL,
    "terms" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_matches" (
    "topicId" TEXT NOT NULL,
    "measureId" TEXT NOT NULL,
    "term" TEXT NOT NULL,

    CONSTRAINT "topic_matches_pkey" PRIMARY KEY ("topicId","measureId")
);

-- CreateIndex
CREATE UNIQUE INDEX "programme_sources_candidateId_url_key" ON "programme_sources"("candidateId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- AddForeignKey
ALTER TABLE "political_documents" ADD CONSTRAINT "political_documents_programmeSourceId_fkey" FOREIGN KEY ("programmeSourceId") REFERENCES "programme_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_sources" ADD CONSTRAINT "programme_sources_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_sources" ADD CONSTRAINT "programme_sources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_matches" ADD CONSTRAINT "topic_matches_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_matches" ADD CONSTRAINT "topic_matches_measureId_fkey" FOREIGN KEY ("measureId") REFERENCES "measures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

