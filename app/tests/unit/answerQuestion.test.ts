import { describe, it, expect, vi, beforeEach } from "vitest"
import type { EvaluationResult, RetrievedChunk } from "@/app/types"

const retrieveRelevantChunksMock = vi.fn()
const generateAnswerMock = vi.fn()
const logQueryRunMock = vi.fn()
const evaluateAnswerMock = vi.fn()
const getGeminiApiKeyMock = vi.fn()

vi.mock("@/app/lib/retrieval/retrieveChunks", () => ({
  retrieveRelevantChunks: retrieveRelevantChunksMock,
}))

vi.mock("@/app/lib/generation/generateAnswer", () => ({
  generateAnswer: generateAnswerMock,
  GENERATION_MODEL: "gpt-5.6-luna",
}))

vi.mock("@/app/lib/generation/evaluateAnswer", () => ({
  evaluateAnswer: evaluateAnswerMock,
}))

vi.mock("@/app/lib/gemini/client", () => ({
  getGeminiApiKey: getGeminiApiKeyMock,
}))

vi.mock("@/app/lib/observability/logQueryRun", () => ({
  logQueryRun: logQueryRunMock,
}))

const sampleChunks: RetrievedChunk[] = [
  {
    chunkId: "chunk-1",
    documentId: "doc-1",
    chunkIndex: 0,
    content: "hello",
    metadata: {},
    documentTitle: "demo1",
    sourceUri: "app/sample-files/demo1.pdf",
    distance: 0.1,
  },
]

const sampleEvaluation: EvaluationResult = {
  faithfulness: 0.9,
  answerRelevancy: 0.8,
  precision: 0.7,
  recall: 0.6,
  reasoning: "Looks solid.",
}

describe("answerQuestion", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    retrieveRelevantChunksMock.mockResolvedValue(sampleChunks)
    generateAnswerMock.mockResolvedValue({ answer: "the answer", sources: sampleChunks })
    logQueryRunMock.mockResolvedValue({ id: "run-1" })
    getGeminiApiKeyMock.mockReturnValue("gemini-api-key")
    evaluateAnswerMock.mockResolvedValue(sampleEvaluation)
  })

  it("retrieves, generates, evaluates, logs the run, and returns the result", async () => {
    const { answerQuestion } = await import("../../lib/generation/answerQuestion")
    const result = await answerQuestion("what is this?", "api-key", "doc-1", 5)

    expect(retrieveRelevantChunksMock).toHaveBeenCalledWith("what is this?", "api-key", 5, "doc-1")
    expect(generateAnswerMock).toHaveBeenCalledWith("what is this?", sampleChunks, "api-key")
    expect(evaluateAnswerMock).toHaveBeenCalledWith("what is this?", "the answer", sampleChunks, "gemini-api-key")
    expect(logQueryRunMock).toHaveBeenCalledWith({
      question: "what is this?",
      documentId: "doc-1",
      topK: 5,
      retrievedChunks: sampleChunks,
      generationModel: "gpt-5.6-luna",
      answer: "the answer",
      evaluation: sampleEvaluation,
    })
    expect(result).toEqual({ answer: "the answer", sources: sampleChunks, evaluation: sampleEvaluation })
  })

  it("still returns the answer even when logging the run fails", async () => {
    logQueryRunMock.mockRejectedValue(new Error("db unavailable"))
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { answerQuestion } = await import("../../lib/generation/answerQuestion")
    const result = await answerQuestion("what is this?", "api-key")

    expect(result).toEqual({ answer: "the answer", sources: sampleChunks, evaluation: sampleEvaluation })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("returns evaluation: null without failing when GEMINI_API_KEY is missing", async () => {
    getGeminiApiKeyMock.mockReturnValue(null)
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { answerQuestion } = await import("../../lib/generation/answerQuestion")
    const result = await answerQuestion("what is this?", "api-key")

    expect(evaluateAnswerMock).not.toHaveBeenCalled()
    expect(result.evaluation).toBeNull()
    expect(logQueryRunMock).toHaveBeenCalledWith(expect.objectContaining({ evaluation: null }))
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it("returns evaluation: null without failing when the judge call throws", async () => {
    evaluateAnswerMock.mockRejectedValue(new Error("judge unavailable"))
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { answerQuestion } = await import("../../lib/generation/answerQuestion")
    const result = await answerQuestion("what is this?", "api-key")

    expect(result.answer).toBe("the answer")
    expect(result.evaluation).toBeNull()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
