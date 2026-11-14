-- CreateEnum
CREATE TYPE "ComparisonScale" AS ENUM ('national', 'regional');

-- AlterTable
ALTER TABLE "indicator_definitions" ADD COLUMN     "comparisonScale" "ComparisonScale" NOT NULL DEFAULT 'national';

