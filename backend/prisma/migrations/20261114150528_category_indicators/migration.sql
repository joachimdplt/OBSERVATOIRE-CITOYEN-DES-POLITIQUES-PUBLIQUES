-- CreateEnum
CREATE TYPE "IndicatorKind" AS ENUM ('number', 'category');

-- AlterTable
ALTER TABLE "indicator_definitions" ADD COLUMN     "categories" JSONB,
ADD COLUMN     "kind" "IndicatorKind" NOT NULL DEFAULT 'number';

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "category" TEXT;


-- Une observation documentée porte soit un nombre, soit une catégorie, jamais
-- les deux ; une absence ne porte ni l'un ni l'autre.
ALTER TABLE observations DROP CONSTRAINT IF EXISTS observation_value_matches_status;
ALTER TABLE observations
  ADD CONSTRAINT observation_value_matches_status
  CHECK (
    (status = 'documented') = (value IS NOT NULL OR category IS NOT NULL)
    AND NOT (value IS NOT NULL AND category IS NOT NULL)
  );
