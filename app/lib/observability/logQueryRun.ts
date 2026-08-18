import { prisma } from "@/app/server/db/prisma"
import { EMBEDDING_MODEL, SIMILARITY_METRIC } from "@/app/lib/retrieval/retrieveChunks"
import type { RetrievedChunk } from "@/app/types"

export type LogQueryRunInput = {
  question: string
  documentId?: string
  topK: number
  retrievedChunks: RetrievedChunk[]
  generationModel?: string
  answer?: string
}

export async function logQueryRun(input: LogQueryRunInput) {
  return prisma.queryRun.create({
    data: {
      question: input.question,
      documentId: input.documentId,
      embeddingModel: EMBEDDING_MODEL,
      similarityMetric: SIMILARITY_METRIC,
      topK: input.topK,
      retrievedChunks: input.retrievedChunks,
      generationModel: input.generationModel,
      answer: input.answer,
    },
  })
}
