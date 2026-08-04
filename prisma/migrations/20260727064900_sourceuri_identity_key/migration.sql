-- DropIndex
DROP INDEX "Document_checksum_key";

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "sourceUri" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Document_sourceUri_key" ON "Document"("sourceUri");

-- CreateIndex
CREATE INDEX "Document_checksum_idx" ON "Document"("checksum");
