import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@/app/generated/prisma"
import type { EvaluationResult, RetrievedChunk } from "@/app/types"

const createMock = vi.fn()
const findUniqueMock = vi.fn()
const updateMock = vi.fn()

vi.mock("@/app/server/db/prisma", () => ({
  prisma: {
    queryRun: { create: createMock, findUnique: findUniqueMock, update: updateMock },
  },
}))

const sampleChunks: RetrievedChunk[] = [
  {
    chunkId: "chunk-1",
    documentId: "doc-1",
    chunkIndex: 0,
    content: "hello",
    metadata: { page: 1 },
    documentTitle: "Demo",
    sourceUri: "app/sample-files/demo1.pdf",
    distance: 0.42,
  },
]

describe("logQueryRun", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("writes a QueryRun row with the retrieval config and snapshot of retrieved chunks", async () => {
    createMock.mockResolvedValue({ id: "run-1" })

    const { logQueryRun } = await import("../../lib/observability/logQueryRun")
    const record = await logQueryRun({
      question: "what is this about?",
      documentId: "doc-1",
      topK: 5,
      retrievedChunks: sampleChunks,
    })

    expect(record).toEqual({ id: "run-1" })
    expect(createMock).toHaveBeenCalledWith({
      data: {
        question: "what is this about?",
        documentId: "doc-1",
        embeddingModel: "text-embedding-3-small",
        similarityMetric: "cosine",
        topK: 5,
        retrievedChunks: sampleChunks,
        generationModel: undefined,
        answer: undefined,
        evaluation: Prisma.JsonNull,
      },
    })
  })

  it("includes generationModel and answer when provided", async () => {
    createMock.mockResolvedValue({ id: "run-2" })

    const { logQueryRun } = await import("../../lib/observability/logQueryRun")
    await logQueryRun({
      question: "what is this about?",
      topK: 5,
      retrievedChunks: sampleChunks,
      generationModel: "gpt-5.6-luna",
      answer: "This is about NIKE's annual report.",
    })

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        generationModel: "gpt-5.6-luna",
        answer: "This is about NIKE's annual report.",
      }),
    })
  })

  it("persists a provided evaluation as-is", async () => {
    createMock.mockResolvedValue({ id: "run-3" })
    const evaluation: EvaluationResult = {
      faithfulness: 0.9,
      answerRelevancy: 0.8,
      precision: 0.7,
      reasoning: "Looks solid.",
      recall: null,
      recallReasoning: null,
    }

    const { logQueryRun } = await import("../../lib/observability/logQueryRun")
    await logQueryRun({
      question: "what is this about?",
      topK: 5,
      retrievedChunks: sampleChunks,
      evaluation,
    })

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ evaluation }),
    })
  })
})

describe("getQueryRunForRecall", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns question, answer, and retrievedChunks for an existing run", async () => {
    findUniqueMock.mockResolvedValue({ question: "what is this?", answer: "the answer", retrievedChunks: sampleChunks })

    const { getQueryRunForRecall } = await import("../../lib/observability/logQueryRun")
    const result = await getQueryRunForRecall("run-1")

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "run-1" },
      select: { question: true, answer: true, retrievedChunks: true },
    })
    expect(result).toEqual({ question: "what is this?", answer: "the answer", retrievedChunks: sampleChunks })
  })

  it("returns null when the run doesn't exist", async () => {
    findUniqueMock.mockResolvedValue(null)

    const { getQueryRunForRecall } = await import("../../lib/observability/logQueryRun")
    expect(await getQueryRunForRecall("missing")).toBeNull()
  })
})

describe("updateQueryRunRecall", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("merges recall and recallReasoning into the existing evaluation JSON", async () => {
    findUniqueMock.mockResolvedValue({
      evaluation: { faithfulness: 0.9, answerRelevancy: 0.8, precision: 0.7, reasoning: "ok", recall: null, recallReasoning: null },
    })

    const { updateQueryRunRecall } = await import("../../lib/observability/logQueryRun")
    await updateQueryRunRecall("run-1", 0.6, "some chunks missed context")

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        evaluation: {
          faithfulness: 0.9,
          answerRelevancy: 0.8,
          precision: 0.7,
          reasoning: "ok",
          recall: 0.6,
          recallReasoning: "some chunks missed context",
        },
      },
    })
  })

  it("throws when the run doesn't exist", async () => {
    findUniqueMock.mockResolvedValue(null)

    const { updateQueryRunRecall } = await import("../../lib/observability/logQueryRun")
    await expect(updateQueryRunRecall("missing", 0.6, "x")).rejects.toThrow("QueryRun missing not found")
  })
})
