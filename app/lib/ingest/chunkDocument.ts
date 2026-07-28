import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import type { NormalizedDocument, JsonValue, DocumentChunk } from "@/app/types"


const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

// Plain splitter for unstructured text (txt, pdf pages).
const plainSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
})

// Markdown-aware separators (lists, code fences, etc.) for oversized sections
// left over after we've already split on headings ourselves.
const markdownSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
})

function splitMarkdownSections(content: string): Array<{ heading?: string; text: string }> {
  const lines = content.split("\n")
  const sections: Array<{ heading?: string; text: string }> = []
  let currentHeading: string | undefined
  let currentLines: string[] = []

  const flush = () => {
    const text = currentLines.join("\n").trim()
    if (text) sections.push({ heading: currentHeading, text })
    currentLines = []
  }

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.*)/)
    if (headingMatch) {
      flush()
      currentHeading = headingMatch[1].trim()
    }
    currentLines.push(line)
  }
  flush()

  return sections
}

export async function chunkDocument(normalized: NormalizedDocument): Promise<DocumentChunk[]> {
  const chunks: DocumentChunk[] = []
  let chunkIndex = 0

  const push = async (
    text: string,
    metadata: Record<string, JsonValue> = {},
    splitter: RecursiveCharacterTextSplitter = plainSplitter
  ) => {
    const trimmed = text.trim()
    if (!trimmed) return

    for (const piece of await splitter.splitText(trimmed)) {
      chunks.push({ chunkIndex: chunkIndex++, content: piece, metadata })
    }
  }

  if (normalized.pages) {
    for (const page of normalized.pages) {
      await push(page.text, { page: page.num })
    }
    return chunks
  }

  if (normalized.sourceType === "md") {
    for (const section of splitMarkdownSections(normalized.content)) {
      await push(section.text, section.heading ? { heading: section.heading } : {}, markdownSplitter)
    }
    return chunks
  }

  await push(normalized.content)
  return chunks
}
