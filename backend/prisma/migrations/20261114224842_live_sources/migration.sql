-- CreateTable
CREATE TABLE "live_sources" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "producer" TEXT NOT NULL,
    "pillar" "Pillar" NOT NULL,
    "datasetUrl" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_readings" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "territoryCode" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resourceModifiedAt" TIMESTAMP(3),
    "rows" JSONB NOT NULL,

    CONSTRAINT "live_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_sources_slug_key" ON "live_sources"("slug");

-- CreateIndex
CREATE INDEX "live_readings_sourceId_territoryCode_fetchedAt_idx" ON "live_readings"("sourceId", "territoryCode", "fetchedAt");

-- AddForeignKey
ALTER TABLE "live_readings" ADD CONSTRAINT "live_readings_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "live_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Une lecture se garde telle que reçue : elle ne se réécrit ni ne s'efface.
CREATE TRIGGER live_reading_never_rewritten
  BEFORE UPDATE OR DELETE ON live_readings
  FOR EACH ROW EXECUTE FUNCTION refuse_raw_rewrite();
