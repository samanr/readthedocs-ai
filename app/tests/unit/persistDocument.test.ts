import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NormalizedDocument } from "@/app/types"

const findUniqueMock = vi.fn()
const upsertMock = vi.fn()
const deleteManyMock = vi.fn()
const createManyMock = vi.fn()
const countMock = vi.fn()
const transactionMock = vi.fn()
const chunkDocumentMock = vi.fn()

vi.mock("@/app/server/db/prisma", () => ({
  prisma: {
    document: { findUnique: findUniqueMock, upsert: upsertMock },
    chunk: { deleteMany: deleteManyMock, createMany: createManyMock, count: countMock },
    $transaction: transactionMock,
  },
}))

vi.mock("../../lib/ingest/chunkDocument", () => ({
  chunkDocument: chunkDocumentMock,
}))

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
    upsertMock.mockResolvedValue({ id: "doc-1" })
    chunkDocumentMock.mockResolvedValue([{ chunkIndex: 0, content: "hello", metadata: {} }])

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    const record = await persistNormalizedDocument(baseNormalized())

    expect(record).toEqual({ id: "doc-1" })
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(chunkDocumentMock).toHaveBeenCalledTimes(1)
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { documentId: "doc-1" } })
    expect(createManyMock).toHaveBeenCalledWith({
      data: [{ documentId: "doc-1", chunkIndex: 0, content: "hello", metadata: {} }],
    })
  })

  it("skips rechunking when the checksum is unchanged and chunks already exist", async () => {
    findUniqueMock.mockResolvedValue({ id: "doc-1", checksum: "checksum-1" })
    upsertMock.mockResolvedValue({ id: "doc-1" })
    countMock.mockResolvedValue(1)

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    await persistNormalizedDocument(baseNormalized({ checksum: "checksum-1" }))

    expect(countMock).toHaveBeenCalledWith({ where: { documentId: "doc-1" } })
    expect(chunkDocumentMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("backfills chunks when the checksum is unchanged but no chunks exist yet", async () => {
    findUniqueMock.mockResolvedValue({ id: "doc-1", checksum: "checksum-1" })
    upsertMock.mockResolvedValue({ id: "doc-1" })
    countMock.mockResolvedValue(0)
    chunkDocumentMock.mockResolvedValue([{ chunkIndex: 0, content: "hello", metadata: {} }])

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    await persistNormalizedDocument(baseNormalized({ checksum: "checksum-1" }))

    expect(chunkDocumentMock).toHaveBeenCalledTimes(1)
    expect(transactionMock).toHaveBeenCalledTimes(1)
  })

  it("does not check chunk count or rechunk when content is empty", async () => {
    findUniqueMock.mockResolvedValue({ id: "doc-1", checksum: "checksum-1" })
    upsertMock.mockResolvedValue({ id: "doc-1" })

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    await persistNormalizedDocument(baseNormalized({ checksum: "checksum-1", content: "   " }))

    expect(countMock).not.toHaveBeenCalled()
    expect(chunkDocumentMock).not.toHaveBeenCalled()
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("rechunks when the checksum changed", async () => {
    findUniqueMock.mockResolvedValue({ id: "doc-1", checksum: "old-checksum" })
    upsertMock.mockResolvedValue({ id: "doc-1" })
    chunkDocumentMock.mockResolvedValue([{ chunkIndex: 0, content: "new", metadata: {} }])

    const { persistNormalizedDocument } = await import("../../lib/ingest/persistDocument")
    await persistNormalizedDocument(baseNormalized({ checksum: "new-checksum" }))

    expect(chunkDocumentMock).toHaveBeenCalledTimes(1)
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { documentId: "doc-1" } })
  })
})
