import { z } from "zod"
import { createLLMAsJudge } from "openevals"
import { prisma } from "@/app/server/db/prisma"
import { getJudgeClient } from "@/app/lib/gemini/client"
import type { EvaluationResult, RetrievedChunk } from "@/app/types"

// Judge context is capped so one oversized document can't blow up the
// per-minute token budget on the free-tier judge model in a single call.
const MAX_FULL_DOCUMENT_CHARS = 50_000

const ChunkScopedSchema = z.object({
  faithfulness: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Fraction of claims in the answer that are directly supported by the numbered context. 1.0 = every claim is grounded, 0.0 = none are."
    ),
  answerRelevancy: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "How directly the answer addresses the question, independent of whether it's grounded. 1.0 = fully on-topic and responsive, 0.0 = off-topic or a non-answer."
    ),
  precision: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Fraction of the numbered context chunks that were actually relevant/necessary to answering the question. 1.0 = every chunk mattered, 0.0 = none did."
    ),
  reasoning: z.string().describe("A short combined explanation covering all three scores."),
})

const RecallSchema = z.object({
  recall: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Estimated fraction of the information needed to fully answer the question that made it into the retrieved context, given the full source document. 1.0 = nothing relevant was left out, 0.0 = highly relevant material was missed entirely."
    ),
  reasoning: z
    .string()
    .describe("A short explanation, noting any obvious gaps between what was retrieved and what the full document contains that's relevant to the question."),
})

const CHUNK_SCOPED_PROMPT = `You are evaluating a RAG (retrieval-augmented generation) system's answer.

Question: {question}

Numbered context chunks retrieved for this question:
{context}

Generated answer:
{answer}

Score the answer on three dimensions, each from 0.0 to 1.0:
- faithfulness: what fraction of claims in the answer are directly supported by the numbered context? Claims not found in the context should be penalized even if they happen to be true.
- answerRelevancy: does the answer actually address what was asked, regardless of whether it's grounded?
- precision: of the numbered chunks, how many were actually relevant/necessary to producing this answer? Irrelevant chunks lower this score.

Provide one short reasoning that covers all three scores.`

const RECALL_PROMPT = `You are evaluating whether a RAG system retrieved enough context to fully answer a question.

Question: {question}

Full source document:
{fullDocument}

Context chunks that were actually retrieved and given to the answering model:
{context}

Score recall from 0.0 to 1.0: of the information present anywhere in the full document that would be needed to completely and correctly answer the question, what fraction made it into the retrieved chunks?`

function formatContext(chunks: RetrievedChunk[]): string {
  return chunks.map((chunk, i) => `[${i + 1}] ${chunk.content}`).join("\n\n")
}

async function getFullDocumentText(chunks: RetrievedChunk[]): Promise<string> {
  const documentIds = [...new Set(chunks.map((chunk) => chunk.documentId))]
  if (documentIds.length === 0) return ""

  const allChunks = await prisma.chunk.findMany({
    where: { documentId: { in: documentIds } },
    orderBy: [{ documentId: "asc" }, { chunkIndex: "asc" }],
    select: { content: true },
  })

  const fullText = allChunks.map((chunk) => chunk.content).join("\n\n")
  return fullText.length > MAX_FULL_DOCUMENT_CHARS
    ? `${fullText.slice(0, MAX_FULL_DOCUMENT_CHARS)}\n\n[...truncated]`
    : fullText
}

export async function evaluateAnswer(
  question: string,
  answer: string,
  chunks: RetrievedChunk[],
  apiKey: string
): Promise<EvaluationResult> {
  const judge = getJudgeClient(apiKey)
  const context = formatContext(chunks)

  const chunkScopedEvaluator = createLLMAsJudge({
    prompt: CHUNK_SCOPED_PROMPT,
    judge,
    outputSchema: ChunkScopedSchema,
  })

  const recallEvaluator = createLLMAsJudge({
    prompt: RECALL_PROMPT,
    judge,
    outputSchema: RecallSchema,
  })

  const chunkScopedPromise = chunkScopedEvaluator({ question, answer, context })
  const recallPromise = getFullDocumentText(chunks).then((fullDocument) =>
    recallEvaluator({ question, context, fullDocument })
  )

  const [chunkScoped, recall] = await Promise.all([chunkScopedPromise, recallPromise])

  return {
    faithfulness: chunkScoped.faithfulness as number,
    answerRelevancy: chunkScoped.answerRelevancy as number,
    precision: chunkScoped.precision as number,
    recall: recall.recall as number,
    reasoning: `${chunkScoped.reasoning as string}\n\n${recall.reasoning as string}`,
  }
}
