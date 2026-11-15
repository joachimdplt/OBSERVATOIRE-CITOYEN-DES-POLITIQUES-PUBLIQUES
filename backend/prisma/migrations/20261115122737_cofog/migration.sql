-- CreateTable
CREATE TABLE "cofog_functions" (
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "parentCode" TEXT,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cofog_functions_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "cofog_functions_display_key" ON "cofog_functions"("display");

-- AddForeignKey
ALTER TABLE "cofog_functions" ADD CONSTRAINT "cofog_functions_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "cofog_functions"("code") ON DELETE SET NULL ON UPDATE CASCADE;

