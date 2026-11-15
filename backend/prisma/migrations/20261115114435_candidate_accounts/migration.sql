-- CreateEnum
CREATE TYPE "SocialNetwork" AS ENUM ('youtube', 'instagram', 'x', 'tiktok');

-- CreateTable
CREATE TABLE "candidate_accounts" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "network" "SocialNetwork" NOT NULL,
    "handle" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_accounts_candidateId_network_handle_key" ON "candidate_accounts"("candidateId", "network", "handle");

-- AddForeignKey
ALTER TABLE "candidate_accounts" ADD CONSTRAINT "candidate_accounts_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

