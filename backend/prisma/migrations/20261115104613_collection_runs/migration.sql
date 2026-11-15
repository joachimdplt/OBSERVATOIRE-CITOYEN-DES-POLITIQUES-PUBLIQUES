-- CreateTable
CREATE TABLE "collection_runs" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN,
    "summary" JSONB,

    CONSTRAINT "collection_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_runs_kind_startedAt_idx" ON "collection_runs"("kind", "startedAt");

