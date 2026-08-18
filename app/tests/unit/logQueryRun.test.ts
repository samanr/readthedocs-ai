import { describe, it, expect, vi, beforeEach } from "vitest"
import type { RetrievedChunk } from "@/app/types"

const createMock = vi.fn()

vi.mock("@/app/server/db/prisma", () => ({
  prisma: {
    queryRun: { create: createMock },
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
})
