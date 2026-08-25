import { prisma } from "@/app/server/db/prisma"
import { Prisma } from "@/app/generated/prisma"
import { EMBEDDING_MODEL, SIMILARITY_METRIC } from "@/app/lib/retrieval/retrieveChunks"
import type { EvaluationResult, RetrievedChunk } from "@/app/types"

export type LogQueryRunInput = {
  question: string
  documentId?: string
  topK: number
  retrievedChunks: RetrievedChunk[]
  generationModel?: string
  answer?: string
  evaluation?: EvaluationResult | null
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
      evaluation: input.evaluation ?? Prisma.JsonNull,
    },
  })
}

export type QueryRunForRecall = {
  question: string
  answer: string | null
  retrievedChunks: RetrievedChunk[]
}

export async function getQueryRunForRecall(queryRunId: string): Promise<QueryRunForRecall | null> {
  const run = await prisma.queryRun.findUnique({
    where: { id: queryRunId },
    select: { question: true, answer: true, retrievedChunks: true },
  })
  if (!run) return null

  return { question: run.question, answer: run.answer, retrievedChunks: run.retrievedChunks as unknown as RetrievedChunk[] }
}

// Recall is computed later than the rest of the evaluation (on-demand, see
// evaluateRecall) -- merge it into the existing evaluation JSON rather than
// overwriting the whole row.
export async function updateQueryRunRecall(queryRunId: string, recall: number, recallReasoning: string) {
  const run = await prisma.queryRun.findUnique({
    where: { id: queryRunId },
    select: { evaluation: true },
  })
  if (!run) throw new Error(`QueryRun ${queryRunId} not found`)

  const existing = (run.evaluation as Record<string, unknown> | null) ?? {}
  const updated = { ...existing, recall, recallReasoning }

  await prisma.queryRun.update({
    where: { id: queryRunId },
    data: { evaluation: updated },
  })
}
