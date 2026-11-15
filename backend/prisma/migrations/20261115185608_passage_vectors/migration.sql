-- CreateTable
CREATE TABLE "passage_vectors" (
    "measureId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "vector" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passage_vectors_pkey" PRIMARY KEY ("measureId")
);
