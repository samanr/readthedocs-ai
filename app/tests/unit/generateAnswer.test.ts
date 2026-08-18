import { describe, it, expect, vi, beforeEach } from "vitest"
import type { RetrievedChunk } from "@/app/types"

const invokeMock = vi.fn()
const chatOpenAIConstructorMock = vi.fn()

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: chatOpenAIConstructorMock,
}))

const sampleChunks: RetrievedChunk[] = [
  {
    chunkId: "chunk-1",
    documentId: "doc-1",
    chunkIndex: 0,
    content: "NIKE sells footwear, apparel, and equipment.",
    metadata: { page: 4 },
    documentTitle: "demo1",
    sourceUri: "app/sample-files/demo1.pdf",
    distance: 0.2,
  },
]

describe("generateAnswer", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    chatOpenAIConstructorMock.mockImplementation(function () {
      return { invoke: invokeMock }
    })
  })

  it("returns a fixed answer without calling the model when there are no chunks", async () => {
    const { generateAnswer } = await import("../../lib/generation/generateAnswer")
    const result = await generateAnswer("what does NIKE sell?", [], "api-key")

    expect(result).toEqual({
      answer: "I don't have any relevant information to answer that.",
      sources: [],
    })
    expect(chatOpenAIConstructorMock).not.toHaveBeenCalled()
  })

  it("uses gpt-5.6-luna and passes the question plus formatted context to the model", async () => {
    invokeMock.mockResolvedValue({ content: "NIKE sells footwear and apparel. [1]" })

    const { generateAnswer } = await import("../../lib/generation/generateAnswer")
    await generateAnswer("what does NIKE sell?", sampleChunks, "api-key")

    expect(chatOpenAIConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "api-key", model: "gpt-5.6-luna" })
    )

    const [messages] = invokeMock.mock.calls[0]
    expect(messages[0].role).toBe("system")
    expect(messages[1].role).toBe("user")
    expect(messages[1].content).toContain("what does NIKE sell?")
    expect(messages[1].content).toContain("[1] (demo1 — page 4)")
    expect(messages[1].content).toContain("NIKE sells footwear, apparel, and equipment.")
  })

  it("returns the model's answer text and echoes back the chunks as sources", async () => {
    invokeMock.mockResolvedValue({ content: "NIKE sells footwear and apparel. [1]" })

    const { generateAnswer } = await import("../../lib/generation/generateAnswer")
    const result = await generateAnswer("what does NIKE sell?", sampleChunks, "api-key")

    expect(result.answer).toBe("NIKE sells footwear and apparel. [1]")
    expect(result.sources).toEqual(sampleChunks)
  })

  it("extracts text when the model returns content as parts instead of a plain string", async () => {
    invokeMock.mockResolvedValue({ content: [{ type: "text", text: "NIKE sells shoes." }] })

    const { generateAnswer } = await import("../../lib/generation/generateAnswer")
    const result = await generateAnswer("what does NIKE sell?", sampleChunks, "api-key")

    expect(result.answer).toBe("NIKE sells shoes.")
  })
})
