import { describe, it, expect, vi, beforeEach } from "vitest"
import type { RetrievedChunk } from "@/app/types"

const retrieveRelevantChunksMock = vi.fn()
const generateAnswerMock = vi.fn()
const logQueryRunMock = vi.fn()

vi.mock("@/app/lib/retrieval/retrieveChunks", () => ({
  retrieveRelevantChunks: retrieveRelevantChunksMock,
}))

vi.mock("@/app/lib/generation/generateAnswer", () => ({
  generateAnswer: generateAnswerMock,
  GENERATION_MODEL: "gpt-5.6-luna",
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

describe("answerQuestion", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    retrieveRelevantChunksMock.mockResolvedValue(sampleChunks)
    generateAnswerMock.mockResolvedValue({ answer: "the answer", sources: sampleChunks })
    logQueryRunMock.mockResolvedValue({ id: "run-1" })
  })

  it("retrieves, generates, logs the run, and returns the result", async () => {
    const { answerQuestion } = await import("../../lib/generation/answerQuestion")
    const result = await answerQuestion("what is this?", "api-key", "doc-1", 5)

    expect(retrieveRelevantChunksMock).toHaveBeenCalledWith("what is this?", "api-key", 5, "doc-1")
    expect(generateAnswerMock).toHaveBeenCalledWith("what is this?", sampleChunks, "api-key")
    expect(logQueryRunMock).toHaveBeenCalledWith({
      question: "what is this?",
      documentId: "doc-1",
      topK: 5,
      retrievedChunks: sampleChunks,
      generationModel: "gpt-5.6-luna",
      answer: "the answer",
    })
    expect(result).toEqual({ answer: "the answer", sources: sampleChunks })
  })

  it("still returns the answer even when logging the run fails", async () => {
    logQueryRunMock.mockRejectedValue(new Error("db unavailable"))
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { answerQuestion } = await import("../../lib/generation/answerQuestion")
    const result = await answerQuestion("what is this?", "api-key")

    expect(result).toEqual({ answer: "the answer", sources: sampleChunks })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
