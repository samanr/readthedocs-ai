import { describe, it, expect, vi, beforeEach } from "vitest"

const queryRawMock = vi.fn()
const executeRawMock = vi.fn()
const transactionMock = vi.fn()
const embedDocumentsMock = vi.fn()
const openAIEmbeddingsConstructorMock = vi.fn()

vi.mock("@/app/server/db/prisma", () => ({
  prisma: {
    $queryRaw: queryRawMock,
    $executeRaw: executeRawMock,
    $transaction: transactionMock,
  },
}))

vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: openAIEmbeddingsConstructorMock,
}))

describe("embedChunksForDocument", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    openAIEmbeddingsConstructorMock.mockImplementation(function () {
      return { embedDocuments: embedDocumentsMock }
    })
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
    executeRawMock.mockResolvedValue(1)
  })

  it("does nothing when every chunk already has an embedding", async () => {
    queryRawMock.mockResolvedValue([])

    const { embedChunksForDocument } = await import("../../lib/ingest/embedChunks")
    await embedChunksForDocument("doc-1", "api-key")

    expect(embedDocumentsMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("only fetches chunks missing embeddings, embeds them, and writes each vector back", async () => {
    queryRawMock.mockResolvedValue([
      { id: "chunk-1", content: "hello" },
      { id: "chunk-2", content: "world" },
    ])
    embedDocumentsMock.mockResolvedValue([
      [0.1, 0.2],
      [0.3, 0.4],
    ])

    const { embedChunksForDocument } = await import("../../lib/ingest/embedChunks")
    await embedChunksForDocument("doc-1", "api-key")

    expect(openAIEmbeddingsConstructorMock).toHaveBeenCalledWith({
      apiKey: "api-key",
      model: "text-embedding-3-small",
    })
    expect(embedDocumentsMock).toHaveBeenCalledWith(["hello", "world"])
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(executeRawMock).toHaveBeenCalledTimes(2)
  })
})
