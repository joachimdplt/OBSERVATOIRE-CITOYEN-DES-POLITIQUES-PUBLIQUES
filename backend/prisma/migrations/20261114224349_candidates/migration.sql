-- AlterTable
ALTER TABLE "measures" ADD COLUMN     "pillar" "Pillar";

-- AlterTable
ALTER TABLE "political_documents" ADD COLUMN     "candidateId" TEXT;

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE,
    "criterion" TEXT NOT NULL,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "declaredAt" DATE NOT NULL,
    "declarationSource" TEXT NOT NULL,
    "programmeUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "elections_slug_key" ON "elections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_electionId_slug_key" ON "candidates"("electionId", "slug");

-- AddForeignKey
ALTER TABLE "political_documents" ADD CONSTRAINT "political_documents_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Un candidat ne s'efface pas : un retrait se dit, il ne s'efface pas.
CREATE TRIGGER candidate_never_deleted
  BEFORE DELETE ON candidates
  FOR EACH ROW EXECUTE FUNCTION refuse_raw_rewrite();
