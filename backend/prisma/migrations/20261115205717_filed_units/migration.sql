-- CreateTable
CREATE TABLE "filed_units" (
    "id" TEXT NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filed_units_pkey" PRIMARY KEY ("id")
);
