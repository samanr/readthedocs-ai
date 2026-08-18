import { describe, it, expect, vi, beforeEach } from "vitest"

const queryRawMock = vi.fn()
const embedQueryMock = vi.fn()
const openAIEmbeddingsConstructorMock = vi.fn()

vi.mock("@/app/server/db/prisma", () => ({
  prisma: {
    $queryRaw: queryRawMock,
  },
}))

vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: openAIEmbeddingsConstructorMock,
}))

describe("retrieveRelevantChunks", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    openAIEmbeddingsConstructorMock.mockImplementation(function () {
      return { embedQuery: embedQueryMock }
    })
  })

  it("embeds the question with the same model used for chunks", async () => {
    embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3])
    queryRawMock.mockResolvedValue([])

    const { retrieveRelevantChunks } = await import("../../lib/retrieval/retrieveChunks")
    await retrieveRelevantChunks("what is this about?", "api-key")

    expect(openAIEmbeddingsConstructorMock).toHaveBeenCalledWith({
      apiKey: "api-key",
      model: "text-embedding-3-small",
    })
    expect(embedQueryMock).toHaveBeenCalledWith("what is this about?")
  })

  it("returns ranked chunks from the query", async () => {
    embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3])
    const results = [
      {
        chunkId: "chunk-1",
        documentId: "doc-1",
        chunkIndex: 0,
        content: "hello",
        metadata: { page: 1 },
        documentTitle: "Demo",
        sourceUri: "app/sample-files/demo1.pdf",
        distance: 0.12,
      },
    ]
    queryRawMock.mockResolvedValue(results)

    const { retrieveRelevantChunks } = await import("../../lib/retrieval/retrieveChunks")
    const chunks = await retrieveRelevantChunks("what is this about?", "api-key")

    expect(chunks).toEqual(results)
  })

  it("defaults topK to 5 when not provided", async () => {
    embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3])
    queryRawMock.mockResolvedValue([])

    const { retrieveRelevantChunks } = await import("../../lib/retrieval/retrieveChunks")
    await retrieveRelevantChunks("what is this about?", "api-key")

    const [, ...values] = queryRawMock.mock.calls[0]
    expect(values).toContain(5)
  })

  it("passes a custom topK through to the query", async () => {
    embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3])
    queryRawMock.mockResolvedValue([])

    const { retrieveRelevantChunks } = await import("../../lib/retrieval/retrieveChunks")
    await retrieveRelevantChunks("what is this about?", "api-key", 10)

    const [, ...values] = queryRawMock.mock.calls[0]
    expect(values).toContain(10)
  })

  it("does not filter by document when documentId is omitted", async () => {
    embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3])
    queryRawMock.mockResolvedValue([])

    const { retrieveRelevantChunks } = await import("../../lib/retrieval/retrieveChunks")
    await retrieveRelevantChunks("what is this about?", "api-key")

    const [, , documentFilter] = queryRawMock.mock.calls[0]
    expect(documentFilter.values).toEqual([])
  })

  it("filters by document when documentId is provided", async () => {
    embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3])
    queryRawMock.mockResolvedValue([])

    const { retrieveRelevantChunks } = await import("../../lib/retrieval/retrieveChunks")
    await retrieveRelevantChunks("what is this about?", "api-key", 5, "doc-123")

    const [, , documentFilter] = queryRawMock.mock.calls[0]
    expect(documentFilter.values).toEqual(["doc-123"])
    expect(documentFilter.strings.join("")).toContain('c."documentId" =')
  })
})
