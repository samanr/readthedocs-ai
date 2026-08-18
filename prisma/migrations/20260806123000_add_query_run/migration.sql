-- CreateTable
CREATE TABLE "QueryRun" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "documentId" TEXT,
    "embeddingModel" TEXT NOT NULL,
    "similarityMetric" TEXT NOT NULL,
    "topK" INTEGER NOT NULL,
    "retrievedChunks" JSONB NOT NULL,
    "generationModel" TEXT,
    "answer" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QueryRun_documentId_idx" ON "QueryRun"("documentId");

-- CreateIndex
CREATE INDEX "QueryRun_createdAt_idx" ON "QueryRun"("createdAt");

-- AddForeignKey
ALTER TABLE "QueryRun" ADD CONSTRAINT "QueryRun_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
