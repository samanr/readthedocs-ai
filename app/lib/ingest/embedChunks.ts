import { OpenAIEmbeddings } from "@langchain/openai"
import { prisma } from "@/app/server/db/prisma"

export async function embedChunksForDocument(documentId: string, apiKey: string) {
  const chunks = await prisma.$queryRaw<Array<{ id: string; content: string }>>`
    SELECT id, content FROM "Chunk" WHERE "documentId" = ${documentId} AND embedding IS NULL
  `

  if (chunks.length === 0) return

  const embeddings = new OpenAIEmbeddings({ apiKey, model: "text-embedding-3-small" })
  const vectors = await embeddings.embedDocuments(chunks.map((chunk) => chunk.content))

  await prisma.$transaction(
    chunks.map((chunk, i) => {
      const vectorLiteral = `[${vectors[i].join(",")}]`
      return prisma.$executeRaw`UPDATE "Chunk" SET embedding = ${vectorLiteral}::vector WHERE id = ${chunk.id}`
    })
  )
}
