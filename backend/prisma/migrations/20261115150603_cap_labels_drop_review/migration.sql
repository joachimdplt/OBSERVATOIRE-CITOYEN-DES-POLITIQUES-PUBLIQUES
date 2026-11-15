-- DropForeignKey
ALTER TABLE "cap_labels" DROP CONSTRAINT "cap_labels_reviewedById_fkey";

-- AlterTable
ALTER TABLE "cap_labels" DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedById";

