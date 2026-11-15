-- CreateTable
CREATE TABLE "cap_topics" (
    "code" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "majorCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "labelFr" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cap_topics_pkey" PRIMARY KEY ("code")
);

-- AddForeignKey
ALTER TABLE "cap_topics" ADD CONSTRAINT "cap_topics_majorCode_fkey" FOREIGN KEY ("majorCode") REFERENCES "cap_topics"("code") ON DELETE SET NULL ON UPDATE CASCADE;

