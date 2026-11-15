-- AlterEnum
ALTER TYPE "LabelStatus" ADD VALUE 'review';

-- AlterTable
ALTER TABLE "cap_labels" ADD COLUMN     "proposals" JSONB;
