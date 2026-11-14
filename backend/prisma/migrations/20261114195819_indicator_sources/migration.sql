-- Un indicateur peut être alimenté par plusieurs jeux de données : le zonage
-- des médecins par l'arrêté de chaque ARS. Le lien unique devient une table
-- de sources ; chaque lien existant y est recopié avant que la colonne ne
-- disparaisse, rien ne se perd.

-- CreateTable
CREATE TABLE "indicator_sources" (
    "indicatorId" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicator_sources_pkey" PRIMARY KEY ("indicatorId","datasetId")
);

-- Les liens d'aujourd'hui, avec qui les a posés et quand.
INSERT INTO "indicator_sources" ("indicatorId", "datasetId", "createdById", "createdAt")
SELECT "id", "datasetId", "createdById", "createdAt" FROM "indicator_definitions";

-- AddForeignKey
ALTER TABLE "indicator_sources" ADD CONSTRAINT "indicator_sources_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicator_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "indicator_sources" ADD CONSTRAINT "indicator_sources_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "source_datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "indicator_sources" ADD CONSTRAINT "indicator_sources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "indicator_definitions" DROP CONSTRAINT "indicator_definitions_datasetId_fkey";

-- AlterTable
ALTER TABLE "indicator_definitions" DROP COLUMN "datasetId";
