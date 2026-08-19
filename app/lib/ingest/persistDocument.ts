// src/lib/ingest/persistDocument.ts
import { prisma } from "@/app/server/db/prisma"
import { loadDocument } from "./loadDocument"
import { chunkDocument } from "./chunkDocument"
import { embedChunksForDocument } from "./embedChunks"
import type { Document } from "@/app/generated/prisma"
import type { NormalizedDocument } from "@/app/types"

export type PersistedDocument = Document & { isDuplicate: boolean }

export async function persistNormalizedDocument(
  normalized: NormalizedDocument,
  apiKey: string
): Promise<PersistedDocument> {
  const fetched = await prisma.document.findUnique({
    where: { sourceUri: normalized.sourceUri },
    select: { id: true, checksum: true },
  })

  // A different sourceUri with the same checksum means this exact content
  // was already ingested under another name (e.g. a re-download, or the
  // user lost their chat and re-uploaded a renamed copy). Resume that
  // existing document instead of creating a second copy and re-embedding —
  // rejecting here would be a dead end, since uploading is the only way
  // back into a document's chat.
  if (!fetched) {
    const duplicate = await prisma.document.findFirst({
      where: { checksum: normalized.checksum, sourceUri: { not: normalized.sourceUri } },
    })

    if (duplicate) {
      await embedChunksForDocument(duplicate.id, apiKey)
      return { ...duplicate, isDuplicate: true }
    }
  }

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

  await embedChunksForDocument(record.id, apiKey)

  return { ...record, isDuplicate: false }
}

export async function ingestAndPersistDocument(filePath: string, apiKey: string) {
  const normalized = await loadDocument(filePath)
  return persistNormalizedDocument(normalized, apiKey)
}
