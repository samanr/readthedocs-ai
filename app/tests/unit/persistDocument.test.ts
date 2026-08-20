import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NormalizedDocument } from "@/app/types"

const findUniqueMock = vi.fn()
const findFirstMock = vi.fn()
const upsertMock = vi.fn()
const deleteManyMock = vi.fn()
const createManyMock = vi.fn()
const countMock = vi.fn()
const transactionMock = vi.fn()
const chunkDocumentMock = vi.fn()
const embedChunksForDocumentMock = vi.fn()

vi.mock("@/app/server/db/prisma", () => ({
  prisma: {
    document: { findUnique: findUniqueMock, findFirst: findFirstMock, upsert: upsertMock },
    chunk: { deleteMany: deleteManyMock, createMany: createManyMock, count: countMock },
    $transaction: transactionMock,
  },
}))

vi.mock("../../lib/ingest/chunkDocument", () => ({
  chunkDocument: chunkDocumentMock,
}))

vi.mock("../../lib/ingest/embedChunks", () => ({
  embedChunksForDocument: embedChunksForDocumentMock,
}))

const API_KEY = "test-api-key"

function baseNormalized(overrides: Partial<NormalizedDocument> = {}): NormalizedDocument {
  return {
    sourceType: "txt",
    sourceUri: "docs/test.txt",
    title: "Test",
    checksum: "checksum-1",
    metadata: {},
    content: "hello",
    ...overrides,
  }
}

describe("persistNormalizedDocument", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
  })

  it("saves a brand-new document and creates its chunks", async () => {
    findUniqueMock.mockResolvedValue(null)
    findFirstMock.mockResolvedValue(null)
    upsertMock.mockResolvedValue({ id: "doc-1" })
    chunkDocumentMock.mockResolvedValue([{ chunkIndex: 0, content: "hello", metadata: {} }])

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    const record = await persistNormalizedDocument(baseNormalized(), API_KEY)

    expect(record).toEqual({ id: "doc-1", isDuplicate: false })
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(chunkDocumentMock).toHaveBeenCalledTimes(1)
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { documentId: "doc-1" } })
    expect(createManyMock).toHaveBeenCalledWith({
      data: [{ documentId: "doc-1", chunkIndex: 0, content: "hello", metadata: {} }],
    })
    expect(embedChunksForDocumentMock).toHaveBeenCalledWith("doc-1", API_KEY)
  })

  it("skips rechunking when the checksum is unchanged and chunks already exist, but still calls embedChunksForDocument to backfill any missing embeddings", async () => {
    findUniqueMock.mockResolvedValue({ id: "doc-1", checksum: "checksum-1" })
    upsertMock.mockResolvedValue({ id: "doc-1" })
    countMock.mockResolvedValue(1)

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    await persistNormalizedDocument(baseNormalized({ checksum: "checksum-1" }), API_KEY)

    expect(countMock).toHaveBeenCalledWith({ where: { documentId: "doc-1" } })
    expect(chunkDocumentMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
    expect(embedChunksForDocumentMock).toHaveBeenCalledWith("doc-1", API_KEY)
  })

  it("backfills chunks when the checksum is unchanged but no chunks exist yet", async () => {
    findUniqueMock.mockResolvedValue({ id: "doc-1", checksum: "checksum-1" })
    upsertMock.mockResolvedValue({ id: "doc-1" })
    countMock.mockResolvedValue(0)
    chunkDocumentMock.mockResolvedValue([{ chunkIndex: 0, content: "hello", metadata: {} }])

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    await persistNormalizedDocument(baseNormalized({ checksum: "checksum-1" }), API_KEY)

    expect(chunkDocumentMock).toHaveBeenCalledTimes(1)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(embedChunksForDocumentMock).toHaveBeenCalledWith("doc-1", API_KEY)
  })

  it("does not check chunk count or rechunk when content is empty", async () => {
    findUniqueMock.mockResolvedValue({ id: "doc-1", checksum: "checksum-1" })
    upsertMock.mockResolvedValue({ id: "doc-1" })

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    await persistNormalizedDocument(baseNormalized({ checksum: "checksum-1", content: "   " }), API_KEY)

    expect(countMock).not.toHaveBeenCalled()
    expect(chunkDocumentMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
    expect(embedChunksForDocumentMock).toHaveBeenCalledWith("doc-1", API_KEY)
  })

  it("resolves to the existing document when a new sourceUri's checksum matches an already-ingested document", async () => {
    findUniqueMock.mockResolvedValue(null)
    findFirstMock.mockResolvedValue({ id: "doc-original", sourceUri: "docs/original.txt", title: "Original" })

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")

    const record = await persistNormalizedDocument(baseNormalized({ sourceUri: "docs/copy.txt" }), API_KEY)

    expect(record).toEqual({
      id: "doc-original",
      sourceUri: "docs/original.txt",
      title: "Original",
      isDuplicate: true,
    })
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { checksum: "checksum-1", sourceUri: { not: "docs/copy.txt" } },
    })
    expect(embedChunksForDocumentMock).toHaveBeenCalledWith("doc-original", API_KEY)
    expect(upsertMock).not.toHaveBeenCalled()
    expect(chunkDocumentMock).not.toHaveBeenCalled()
  })

  it("does not run the duplicate-checksum check when the sourceUri already exists (update path)", async () => {
    findUniqueMock.mockResolvedValue({ id: "doc-1", checksum: "old-checksum" })
    upsertMock.mockResolvedValue({ id: "doc-1" })
    chunkDocumentMock.mockResolvedValue([{ chunkIndex: 0, content: "new", metadata: {} }])

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    await persistNormalizedDocument(baseNormalized({ checksum: "new-checksum" }), API_KEY)

    expect(findFirstMock).not.toHaveBeenCalled()
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it("rechunks when the checksum changed", async () => {
    findUniqueMock.mockResolvedValue({ id: "doc-1", checksum: "old-checksum" })
    upsertMock.mockResolvedValue({ id: "doc-1" })
    chunkDocumentMock.mockResolvedValue([{ chunkIndex: 0, content: "new", metadata: {} }])

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    await persistNormalizedDocument(baseNormalized({ checksum: "new-checksum" }), API_KEY)

    expect(chunkDocumentMock).toHaveBeenCalledTimes(1)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { documentId: "doc-1" } })
    expect(embedChunksForDocumentMock).toHaveBeenCalledWith("doc-1", API_KEY)
  })
})
