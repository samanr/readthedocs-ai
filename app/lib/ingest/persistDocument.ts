// src/lib/ingest/persistDocument.ts
import { prisma } from "@/app/server/db/prisma"
import { loadDocument } from "./loadDocument"
import { chunkDocument } from "./chunkDocument"
import type { NormalizedDocument } from "@/app/types"

export async function persistNormalizedDocument(normalized: NormalizedDocument) {
  const fetched = await prisma.document.findUnique({
    where: { sourceUri: normalized.sourceUri },
    select: { id: true, checksum: true },
  })

  const record = await prisma.document.upsert({
    where: { sourceUri: normalized.sourceUri },
    update: {
      sourceType: normalized.sourceType,
      title: normalized.title,
      checksum: normalized.checksum,
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

  const contentChanged = !fetched || fetched.checksum !== normalized.checksum
  const hasContent = normalized.content.trim().length > 0

  let needsChunking = contentChanged
  if (!needsChunking && hasContent) {
    const existingChunkCount = await prisma.chunk.count({ where: { documentId: record.id } })
    needsChunking = existingChunkCount === 0
  }

  if (needsChunking) {
    const chunks = await chunkDocument(normalized)

    await prisma.$transaction([
      prisma.chunk.deleteMany({ where: { documentId: record.id } }),
      prisma.chunk.createMany({
        data: chunks.map((chunk) => ({
          documentId: record.id,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          metadata: chunk.metadata,
        })),
      }),
    ])
  }

  return record
}

export async function ingestAndPersistDocument(filePath: string) {
  const normalized = await loadDocument(filePath)
  return persistNormalizedDocument(normalized)
}
