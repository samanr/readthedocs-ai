import { describe, it, expect, vi, beforeEach } from "vitest"

const grayMatterMock = vi.fn()
const createHashMock = vi.fn()
const pdfParseGetTextMock = vi.fn()

vi.mock("gray-matter", () => ({ default: grayMatterMock }))
vi.mock("pdf-parse", () => ({ PDFParse: vi.fn().mockImplementation(() => ({ getText: pdfParseGetTextMock })) }))
vi.mock("node:crypto", () => ({ default: { createHash: createHashMock } }))

function setupSha256(result = "sha256") {
  const digest = vi.fn().mockReturnValue(result)
  const update = vi.fn().mockReturnValue({ digest })
  createHashMock.mockReturnValue({ update })
}

describe.only("normalizeDocument", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupSha256("checksum-123")
  })

  it("normalizes markdown using frontmatter title and content", async () => {
    grayMatterMock.mockReturnValue({
      data: { title: "My Title", tags: ["a", "b"] },
      content: "\nHello md\n",
    })

    const { normalizeDocument } = await import("../../lib/ingest/normalizeDocument")
    const result = await normalizeDocument({
      filePath: "/docs/my-file.md",
      rawContent: "---\ntitle: My Title\n---\nHello md\n",
    })

    expect(result).toEqual({
      sourceType: "md",
      sourceUri: "/docs/my-file.md",
      title: "My Title",
      checksum: "checksum-123",
      metadata: { title: "My Title", tags: ["a", "b"] },
      content: "Hello md",
    })
  })

  it("falls back to filename title for markdown without title", async () => {
    grayMatterMock.mockReturnValue({ data: { tags: ["a"] }, content: "Body" })

    const { normalizeDocument } = await import("../../lib/ingest/normalizeDocument")
    const result = await normalizeDocument({
      filePath: "/docs/hello-world.md",
      rawContent: "---\ntags:\n  - a\n---\nBody",
    })

    expect(result.title).toBe("hello world")
    expect(result.metadata).toEqual({ tags: ["a"] })
  })

  it("normalizes text files with empty metadata", async () => {
    const { normalizeDocument } = await import("../../lib/ingest/normalizeDocument")
    const result = await normalizeDocument({
      filePath: "/docs/note.txt",
      rawContent: "  plain text  ",
    })

    expect(result).toEqual({
      sourceType: "txt",
      sourceUri: "/docs/note.txt",
      title: "note",
      checksum: "checksum-123",
      metadata: {},
      content: "plain text",
    })
  })

  it("throws for unsupported extensions", async () => {
    const { normalizeDocument } = await import("../../lib/ingest/normalizeDocument")
    await expect(
      normalizeDocument({ filePath: "/docs/file.docx", rawContent: "x" })
    ).rejects.toThrow("Unsupported file type: .docx")
  })

  it("throws when pdf buffer is missing", async () => {
    const { normalizeDocument } = await import("../../lib/ingest/normalizeDocument")
    await expect(
      normalizeDocument({ filePath: "/docs/file.pdf" })
    ).rejects.toThrow("PDF normalization requires a buffer")
  })
})