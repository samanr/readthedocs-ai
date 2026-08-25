import { retrieveRelevantChunks, DEFAULT_TOP_K } from "@/app/lib/retrieval/retrieveChunks"
import { generateAnswer, GENERATION_MODEL } from "@/app/lib/generation/generateAnswer"
import { evaluateAnswer } from "@/app/lib/generation/evaluateAnswer"
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

// Evaluation runs on a separate free-tier judge model and is never allowed
// to block or fail the actual answer -- a missing GEMINI_API_KEY, a judge
// call failure, or a timeout all just mean no evaluation for this run.
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
    return await withTimeout(evaluateAnswer(question, answer, chunks, geminiApiKey), EVALUATION_TIMEOUT_MS)
  } catch (error) {
    console.error("Evaluation failed:", error)
    return null
  }
}

export async function answerQuestion(
  question: string,
  apiKey: string,
  documentId?: string
): Promise<GenerateAnswerResult & { evaluation: EvaluationResult | null }> {
  const chunks = await retrieveRelevantChunks(question, apiKey, documentId)
  const result = await generateAnswer(question, chunks, apiKey)
  const evaluation = await evaluateIfConfigured(question, result.answer, chunks)

  try {
    await logQueryRun({
      question,
      documentId,
      topK: DEFAULT_TOP_K,
      retrievedChunks: chunks,
      generationModel: GENERATION_MODEL,
      answer: result.answer,
      evaluation,
    })
  } catch (error) {
    console.error("Failed to log query run:", error)
  }

  return { ...result, evaluation }
}
