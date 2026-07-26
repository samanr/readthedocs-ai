// src/lib/ingest/normalizeDocument.ts
import path from "node:path"
import crypto from "node:crypto"
import matter from "gray-matter"
import { PDFParse } from "pdf-parse"

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type NormalizedDocument = {
  sourceType: "md" | "txt" | "pdf"
  sourceUri: string
  title: string
  checksum: string
  metadata: Record<string, JsonValue>
  content: string
}

type NormalizeInput = {
  filePath: string
  rawContent?: string
  buffer?: Buffer
}

function sha256(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function titleFromFilePath(filePath: string) {
  return path.basename(filePath, path.extname(filePath)).replace(/[-_]+/g, " ").trim()
}

function sourceTypeFromPath(filePath: string): "md" | "txt" | "pdf" {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".md") return "md"
  if (ext === ".txt") return "txt"
  if (ext === ".pdf") return "pdf"
  throw new Error(`Unsupported file type: ${ext}`)
}

export async function normalizeDocument(input: NormalizeInput): Promise<NormalizedDocument> {
  const sourceType = sourceTypeFromPath(input.filePath)
  const sourceUri = input.filePath
  const baseTitle = titleFromFilePath(input.filePath)

  if (sourceType === "pdf") {
    if (!input.buffer) throw new Error("PDF normalization requires a buffer")

    try {
      const parser = new PDFParse({ data: input.buffer })
      const parsed = await parser.getText()
      return {
      sourceType,
      sourceUri,
      title: baseTitle,
      checksum: sha256(input.buffer),
      metadata: {
        pageCount: parsed.total,
      },
      content: parsed.text.trim(),
    }
    } catch (error) {
      console.error("PDF parse failed:", input.filePath, input.buffer.length, input.buffer.subarray(0, 20))
      throw error
    }
    
  }

  if (!input.rawContent) {
    throw new Error(`${sourceType.toUpperCase()} normalization requires rawContent`)
  }

  const checksum = sha256(input.rawContent)

  if (sourceType === "md") {
    const parsed = matter(input.rawContent)
    const frontmatter = parsed.data as Record<string, JsonValue>

    return {
      sourceType,
      sourceUri,
      title: typeof frontmatter.title === "string" ? frontmatter.title : baseTitle,
      checksum,
      metadata: frontmatter,
      content: parsed.content.trim(),
    }
  }

  return {
    sourceType,
    sourceUri,
    title: baseTitle,
    checksum,
    metadata: {},
    content: input.rawContent.trim(),
  }
}