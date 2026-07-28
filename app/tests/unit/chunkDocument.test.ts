import { describe, it, expect } from "vitest"
import { chunkDocument } from "../../lib/ingest/chunkDocument"
import type { NormalizedDocument } from "@/app/types"

function baseDoc(overrides: Partial<NormalizedDocument>): NormalizedDocument {
  return {
    sourceType: "txt",
    sourceUri: "docs/test.txt",
    title: "Test",
    checksum: "checksum-123",
    metadata: {},
    content: "",
    ...overrides,
  }
}

describe("chunkDocument", () => {
  it("returns a single chunk for content shorter than the chunk size", async () => {
    const chunks = await chunkDocument(baseDoc({ content: "short content" }))

    expect(chunks).toEqual([{ chunkIndex: 0, content: "short content", metadata: {} }])
  })

  it("splits long plain text into multiple overlapping chunks", async () => {
    const content = Array.from({ length: 100 }, (_, i) => `Sentence number ${i}.`).join(" ")
    const chunks = await chunkDocument(baseDoc({ content }))

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i))

    const lastSentence = chunks[0].content.trim().split(" ").slice(-3).join(" ")
    expect(chunks[1].content).toContain(lastSentence)
  })

  it("tags each chunk with its heading for markdown sections", async () => {
    const content = "# Intro\nShort intro text.\n\n## Details\nShort details text."
    const chunks = await chunkDocument(baseDoc({ sourceType: "md", content }))

    expect(chunks).toEqual([
      { chunkIndex: 0, content: "# Intro\nShort intro text.", metadata: { heading: "Intro" } },
      { chunkIndex: 1, content: "## Details\nShort details text.", metadata: { heading: "Details" } },
    ])
  })

  it("tags each chunk with its page number and keeps a running chunkIndex across pages", async () => {
    const doc = baseDoc({
      sourceType: "pdf",
      content: "Page one text\n\nPage two text",
      pages: [
        { num: 1, text: "Page one text" },
        { num: 2, text: "Page two text" },
      ],
    })

    const chunks = await chunkDocument(doc)

    expect(chunks).toEqual([
      { chunkIndex: 0, content: "Page one text", metadata: { page: 1 } },
      { chunkIndex: 1, content: "Page two text", metadata: { page: 2 } },
    ])
  })

  it("returns no chunks for empty content", async () => {
    const chunks = await chunkDocument(baseDoc({ content: "   " }))
    expect(chunks).toEqual([])
  })
})
