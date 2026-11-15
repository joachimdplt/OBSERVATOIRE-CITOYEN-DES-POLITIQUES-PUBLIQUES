-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "photoAuthor" TEXT,
ADD COLUMN     "photoCheckedAt" TIMESTAMP(3),
ADD COLUMN     "photoLicence" TEXT,
ADD COLUMN     "photoLicenceUrl" TEXT,
ADD COLUMN     "photoPage" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "wikidataId" TEXT;

