import { prisma } from "@/app/server/db/prisma"
import { Prisma } from "@/app/generated/prisma"
import { EMBEDDING_MODEL, getEmbeddingsClient } from "@/app/lib/openai/client"
import type { RetrievedChunk } from "@/app/types"

export { EMBEDDING_MODEL }
export const SIMILARITY_METRIC = "cosine"

const TOP_K_DEFAULT = 5
const TOP_K_MIN = 1
const TOP_K_MAX = 50

function parseTopK(): number {
  const raw = process.env.RAG_TOP_K
  if (!raw) return TOP_K_DEFAULT

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed) || parsed < TOP_K_MIN || parsed > TOP_K_MAX) {
    console.error(
      `Invalid RAG_TOP_K="${raw}" (must be an integer ${TOP_K_MIN}-${TOP_K_MAX}); using default of ${TOP_K_DEFAULT}.`
    )
    return TOP_K_DEFAULT
  }
  return parsed
}

export const DEFAULT_TOP_K = parseTopK()

export async function retrieveRelevantChunks(
  question: string,
  apiKey: string,
  documentId?: string
): Promise<RetrievedChunk[]> {
  const embeddings = getEmbeddingsClient(apiKey)
  const queryVector = await embeddings.embedQuery(question)
  const vectorLiteral = `[${queryVector.join(",")}]`

  const documentFilter = documentId ? Prisma.sql`AND c."documentId" = ${documentId}` : Prisma.empty

  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      c.id AS "chunkId",
      c."documentId" AS "documentId",
      c."chunkIndex" AS "chunkIndex",
      c.content AS content,
      c.metadata AS metadata,
      d.title AS "documentTitle",
      d."sourceUri" AS "sourceUri",
      (c.embedding <=> ${vectorLiteral}::vector) AS distance
    FROM "Chunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE c.embedding IS NOT NULL ${documentFilter}
    ORDER BY distance ASC
    LIMIT ${DEFAULT_TOP_K}
  `
}
