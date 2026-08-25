import { retrieveRelevantChunks, DEFAULT_TOP_K } from "@/app/lib/retrieval/retrieveChunks"
import { generateAnswer, GENERATION_MODEL } from "@/app/lib/generation/generateAnswer"
import { evaluateChunkScoped } from "@/app/lib/generation/evaluateAnswer"
import { getGeminiApiKey } from "@/app/lib/gemini/client"
import { logQueryRun } from "@/app/lib/observability/logQueryRun"
import type { EvaluationResult, GenerateAnswerResult, RetrievedChunk } from "@/app/types"

const EVALUATION_TIMEOUT_MS = 15_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Evaluation timed out after ${ms}ms`)), ms)
    }),
  ])
}

// Only the cheap chunk-scoped metrics run automatically. Recall is
// deliberately excluded here -- it's expensive (sends the full document)
// and only worth computing when a user explicitly asks for it via the
// "run recall check" progressive-disclosure action, not on every answer.
async function evaluateIfConfigured(
  question: string,
  answer: string,
  chunks: RetrievedChunk[]
): Promise<EvaluationResult | null> {
  const geminiApiKey = getGeminiApiKey()
  if (!geminiApiKey) {
    console.error("Skipping evaluation: GEMINI_API_KEY is missing.")
    return null
  }

  try {
    const chunkScoped = await withTimeout(
      evaluateChunkScoped(question, answer, chunks, geminiApiKey),
      EVALUATION_TIMEOUT_MS
    )
    return { ...chunkScoped, recall: null, recallReasoning: null }
  } catch (error) {
    console.error("Evaluation failed:", error)
    return null
  }
}

export async function answerQuestion(
  question: string,
  apiKey: string,
  documentId?: string
): Promise<GenerateAnswerResult & { evaluation: EvaluationResult | null; queryRunId: string | null }> {
  const chunks = await retrieveRelevantChunks(question, apiKey, documentId)
  const result = await generateAnswer(question, chunks, apiKey)
  const evaluation = await evaluateIfConfigured(question, result.answer, chunks)

  let queryRunId: string | null = null
  try {
    const record = await logQueryRun({
      question,
      documentId,
      topK: DEFAULT_TOP_K,
      retrievedChunks: chunks,
      generationModel: GENERATION_MODEL,
      answer: result.answer,
      evaluation,
    })
    queryRunId = record.id
  } catch (error) {
    console.error("Failed to log query run:", error)
  }

  return { ...result, evaluation, queryRunId }
}
