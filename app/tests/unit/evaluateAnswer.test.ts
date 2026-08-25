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

describe("evaluateAnswer", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getJudgeClientMock.mockReturnValue({ fakeModel: true })
    findManyMock.mockResolvedValue([{ content: "NIKE sells shoes." }])
    chunkScopedEvaluatorMock.mockResolvedValue({
      faithfulness: 0.9,
      answerRelevancy: 0.8,
      precision: 0.7,
      reasoning: "chunk reasoning",
    })
    recallEvaluatorMock.mockResolvedValue({ recall: 0.6, reasoning: "recall reasoning" })

    createLLMAsJudgeMock.mockImplementation(({ prompt }: { prompt: string }) =>
      prompt.includes("{fullDocument}") ? recallEvaluatorMock : chunkScopedEvaluatorMock
    )
  })

  it("combines chunk-scoped scores with the recall score and merges reasoning", async () => {
    const { evaluateAnswer } = await import("../../lib/generation/evaluateAnswer")

    const result = await evaluateAnswer("what does NIKE sell?", "NIKE sells shoes.", sampleChunks, "gemini-key")

    expect(getJudgeClientMock).toHaveBeenCalledWith("gemini-key")
    expect(result).toEqual({
      faithfulness: 0.9,
      answerRelevancy: 0.8,
      precision: 0.7,
      recall: 0.6,
      reasoning: "chunk reasoning\n\nrecall reasoning",
    })
  })

  it("passes the question, formatted context, and answer to the chunk-scoped evaluator", async () => {
    const { evaluateAnswer } = await import("../../lib/generation/evaluateAnswer")
    await evaluateAnswer("what does NIKE sell?", "NIKE sells shoes.", sampleChunks, "gemini-key")

    expect(chunkScopedEvaluatorMock).toHaveBeenCalledWith({
      question: "what does NIKE sell?",
      answer: "NIKE sells shoes.",
      context: "[1] NIKE sells shoes.",
    })
  })

  it("reconstructs the full document from all chunks for the retrieved documentIds, ordered by chunkIndex", async () => {
    const { evaluateAnswer } = await import("../../lib/generation/evaluateAnswer")
    await evaluateAnswer("what does NIKE sell?", "NIKE sells shoes.", sampleChunks, "gemini-key")

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
  })

  it("truncates an oversized reconstructed document before sending it to the recall evaluator", async () => {
    findManyMock.mockResolvedValue([{ content: "x".repeat(60_000) }])

    const { evaluateAnswer } = await import("../../lib/generation/evaluateAnswer")
    await evaluateAnswer("what does NIKE sell?", "NIKE sells shoes.", sampleChunks, "gemini-key")

    const [{ fullDocument }] = recallEvaluatorMock.mock.calls[0]
    expect(fullDocument.length).toBeLessThan(60_000)
    expect(fullDocument.endsWith("[...truncated]")).toBe(true)
  })
})
