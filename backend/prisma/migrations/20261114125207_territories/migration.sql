-- CreateEnum
CREATE TYPE "TerritoryLevel" AS ENUM ('country', 'region', 'department', 'commune', 'municipal_district');

-- CreateTable
CREATE TABLE "territory_vintages" (
    "year" INTEGER NOT NULL,
    "sources" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "territory_vintages_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "territories" (
    "id" TEXT NOT NULL,
    "level" "TerritoryLevel" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vintage" INTEGER NOT NULL,
    "regionCode" TEXT,
    "departmentCode" TEXT,
    "communeCode" TEXT,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "territories_level_code_vintage_key" ON "territories"("level", "code", "vintage");

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_vintage_fkey" FOREIGN KEY ("vintage") REFERENCES "territory_vintages"("year") ON DELETE RESTRICT ON UPDATE CASCADE;
