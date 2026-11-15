-- CreateTable
CREATE TABLE "topic_vectors" (
    "code" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "vector" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_vectors_pkey" PRIMARY KEY ("code","model")
);
