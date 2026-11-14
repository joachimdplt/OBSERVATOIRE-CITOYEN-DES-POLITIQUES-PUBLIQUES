-- CreateEnum
CREATE TYPE "ProgrammeStatus" AS ENUM ('complete', 'partial', 'none');

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "programmeStatus" "ProgrammeStatus" NOT NULL DEFAULT 'none';

