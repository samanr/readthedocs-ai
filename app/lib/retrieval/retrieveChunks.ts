import { OpenAIEmbeddings } from "@langchain/openai"
import { prisma } from "@/app/server/db/prisma"
import { Prisma } from "@/app/generated/prisma"
import type { RetrievedChunk } from "@/app/types"

export async function retrieveRelevantChunks(
  question: string,
  apiKey: string,
  topK = 5,
  documentId?: string
): Promise<RetrievedChunk[]> {
  const embeddings = new OpenAIEmbeddings({ apiKey, model: "text-embedding-3-small" })
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
    LIMIT ${topK}
  `
}
