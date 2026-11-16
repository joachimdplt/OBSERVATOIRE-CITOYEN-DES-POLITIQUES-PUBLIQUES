-- CreateTable
CREATE TABLE "classifier_calibrations" (
    "id" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "chapters" INTEGER NOT NULL,
    "candidates" INTEGER NOT NULL,
    "threshold" DOUBLE PRECISION,
    "right" INTEGER,
    "total" INTEGER,
    "low" DOUBLE PRECISION,

    CONSTRAINT "classifier_calibrations_pkey" PRIMARY KEY ("id")
);
