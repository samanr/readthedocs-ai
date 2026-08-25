import { describe, it, expect, vi, beforeEach } from "vitest"
import type { RetrievedChunk } from "@/app/types"

const createLLMAsJudgeMock = vi.fn()
const getJudgeClientMock = vi.fn()
const findManyMock = vi.fn()
const chunkScopedEvaluatorMock = vi.fn()
const recallEvaluatorMock = vi.fn()

vi.mock("openevals", () => ({
  createLLMAsJudge: createLLMAsJudgeMock,
}))

vi.mock("@/app/lib/gemini/client", () => ({
  getJudgeClient: getJudgeClientMock,
}))

vi.mock("@/app/server/db/prisma", () => ({
  prisma: {
    chunk: { findMany: findManyMock },
  },
}))

const sampleChunks: RetrievedChunk[] = [
  {
    chunkId: "chunk-1",
    documentId: "doc-1",
    chunkIndex: 0,
    content: "NIKE sells shoes.",
    metadata: {},
    documentTitle: "Demo",
    sourceUri: "app/sample-files/demo1.pdf",
    distance: 0.1,
  },
]

describe("evaluateChunkScoped", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getJudgeClientMock.mockReturnValue({ fakeModel: true })
    chunkScopedEvaluatorMock.mockResolvedValue({
      faithfulness: 0.9,
      answerRelevancy: 0.8,
      precision: 0.7,
      reasoning: "chunk reasoning",
    })
    createLLMAsJudgeMock.mockReturnValue(chunkScopedEvaluatorMock)
  })

  it("scores faithfulness, relevancy, and precision from the retrieved chunks only", async () => {
    const { evaluateChunkScoped } = await import("../../lib/generation/evaluateAnswer")

    const result = await evaluateChunkScoped("what does NIKE sell?", "NIKE sells shoes.", sampleChunks, "gemini-key")

    expect(getJudgeClientMock).toHaveBeenCalledWith("gemini-key")
    expect(chunkScopedEvaluatorMock).toHaveBeenCalledWith({
      question: "what does NIKE sell?",
      answer: "NIKE sells shoes.",
      context: "[1] NIKE sells shoes.",
    })
    expect(result).toEqual({
      faithfulness: 0.9,
      answerRelevancy: 0.8,
      precision: 0.7,
      reasoning: "chunk reasoning",
    })
    expect(findManyMock).not.toHaveBeenCalled()
  })
})

describe("evaluateRecall", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getJudgeClientMock.mockReturnValue({ fakeModel: true })
    findManyMock.mockResolvedValue([{ content: "NIKE sells shoes." }])
    recallEvaluatorMock.mockResolvedValue({ recall: 0.6, reasoning: "recall reasoning" })
    createLLMAsJudgeMock.mockReturnValue(recallEvaluatorMock)
  })

  it("scores recall against the reconstructed full document", async () => {
    const { evaluateRecall } = await import("../../lib/generation/evaluateAnswer")

    const result = await evaluateRecall("what does NIKE sell?", sampleChunks, "gemini-key")

    expect(findManyMock).toHaveBeenCalledWith({
      where: { documentId: { in: ["doc-1"] } },
      orderBy: [{ documentId: "asc" }, { chunkIndex: "asc" }],
      select: { content: true },
    })
    expect(recallEvaluatorMock).toHaveBeenCalledWith({
      question: "what does NIKE sell?",
      context: "[1] NIKE sells shoes.",
      fullDocument: "NIKE sells shoes.",
    })
    expect(result).toEqual({ recall: 0.6, recallReasoning: "recall reasoning" })
  })

  it("truncates an oversized reconstructed document before sending it to the judge", async () => {
    findManyMock.mockResolvedValue([{ content: "x".repeat(60_000) }])

    const { evaluateRecall } = await import("../../lib/generation/evaluateAnswer")
    await evaluateRecall("what does NIKE sell?", sampleChunks, "gemini-key")

    const [{ fullDocument }] = recallEvaluatorMock.mock.calls[0]
    expect(fullDocument.length).toBeLessThan(60_000)
    expect(fullDocument.endsWith("[...truncated]")).toBe(true)
  })
})
