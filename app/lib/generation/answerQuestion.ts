import { retrieveRelevantChunks } from "@/app/lib/retrieval/retrieveChunks"
import { generateAnswer, GENERATION_MODEL } from "@/app/lib/generation/generateAnswer"
import { logQueryRun } from "@/app/lib/observability/logQueryRun"
import type { GenerateAnswerResult } from "@/app/types"

export async function answerQuestion(
  question: string,
  apiKey: string,
  documentId?: string,
  topK = 5
): Promise<GenerateAnswerResult> {
  const chunks = await retrieveRelevantChunks(question, apiKey, topK, documentId)
  const result = await generateAnswer(question, chunks, apiKey)

  try {
    await logQueryRun({
      question,
      documentId,
      topK,
      retrievedChunks: chunks,
      generationModel: GENERATION_MODEL,
      answer: result.answer,
    })
  } catch (error) {
    console.error("Failed to log query run:", error)
  }

  return result
}
