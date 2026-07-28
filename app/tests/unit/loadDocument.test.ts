import { describe, it, expect, vi, beforeEach } from "vitest"

const readFileMock = vi.fn()
const normalizeDocumentMock = vi.fn()

vi.mock("node:fs/promises", () => ({
  readFile: readFileMock,
}))

vi.mock("../../lib/ingest/normalizeDocument", () => ({
  normalizeDocument: normalizeDocumentMock,
}))

const fixtureFilePath = "../fixtures/fixture-1.pdf"
const txtFilePath = "../fixtures/fixture-1.txt"

describe("loadDocument", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("loads pdf files as buffers", async () => {
    const { loadDocument } = await import("../../lib/ingest/loadDocument")
    const buffer = Buffer.from("pdf-bytes")

    readFileMock.mockResolvedValue(buffer)
    normalizeDocumentMock.mockResolvedValue({ ok: true })

    const result = await loadDocument(fixtureFilePath)

    expect(readFileMock).toHaveBeenCalledWith(fixtureFilePath)
    expect(normalizeDocumentMock).toHaveBeenCalledWith({
      filePath: fixtureFilePath,
      buffer,
    })
    expect(result).toEqual({ ok: true })
  })

  it("loads text files as utf8 content", async () => {
    const { loadDocument } = await import("../../lib/ingest/loadDocument")

    readFileMock.mockResolvedValue("hello world")
    normalizeDocumentMock.mockResolvedValue({ ok: true })

    const result = await loadDocument(txtFilePath)

    expect(readFileMock).toHaveBeenCalledWith(txtFilePath, "utf8")
    expect(normalizeDocumentMock).toHaveBeenCalledWith({
      filePath: txtFilePath,
      rawContent: "hello world",
    })
    expect(result).toEqual({ ok: true })
  })
})