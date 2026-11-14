-- CreateEnum
CREATE TYPE "Origin" AS ENUM ('team', 'automatic');

-- AlterTable
ALTER TABLE "measures" ADD COLUMN     "origin" "Origin" NOT NULL DEFAULT 'team',
ALTER COLUMN "label" DROP NOT NULL;

-- AlterTable
ALTER TABLE "political_documents" ADD COLUMN     "origin" "Origin" NOT NULL DEFAULT 'team',
ADD COLUMN     "sourceRef" TEXT;

-- AlterTable
ALTER TABLE "publications" ADD COLUMN     "watchTerms" TEXT[];

-- CreateTable
CREATE TABLE "document_matches" (
    "publicationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_matches_pkey" PRIMARY KEY ("publicationId","documentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "political_documents_sourceRef_key" ON "political_documents"("sourceRef");

-- AddForeignKey
ALTER TABLE "document_matches" ADD CONSTRAINT "document_matches_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_matches" ADD CONSTRAINT "document_matches_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "political_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Une mesure saisie par l'équipe porte toujours son libellé ; seule une
-- mesure collectée automatiquement peut s'en passer, jusqu'à sa relecture.
ALTER TABLE "measures" ADD CONSTRAINT "measure_team_has_label"
  CHECK (origin = 'automatic' OR (label IS NOT NULL AND length(trim(label)) > 0));
