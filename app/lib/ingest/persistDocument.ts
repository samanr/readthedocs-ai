// src/lib/ingest/persistDocument.ts
import { prisma } from "@/app/server/db/prisma"
import { loadDocument } from "./loadDocument"

export async function ingestAndPersistDocument(filePath: string) {
  const normalized = await loadDocument(filePath)

  const record = await prisma.document.upsert({
    where: { checksum: normalized.checksum },
    update: {
      sourceType: normalized.sourceType,
      sourceUri: normalized.sourceUri,
      title: normalized.title,
      metadata: normalized.metadata,
    },
    create: {
      sourceType: normalized.sourceType,
      sourceUri: normalized.sourceUri,
      title: normalized.title,
      checksum: normalized.checksum,
      metadata: normalized.metadata,
    },
  })

  return record
}