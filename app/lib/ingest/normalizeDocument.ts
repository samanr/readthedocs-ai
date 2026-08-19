// src/lib/ingest/normalizeDocument.ts
import path from "node:path"
import crypto from "node:crypto"
import matter from "gray-matter"
import { PDFParse } from "pdf-parse"
import type { JsonValue, NormalizedDocument, NormalizeInput } from "@/app/types"

// pdfjs-dist normally spins up its worker via a runtime `import(workerSrc)`,
// which Turbopack's bundled dev/prod output can't resolve ("Setting up fake
// worker failed: Cannot find module '.../pdf.worker.mjs'"). pdf.worker.mjs
// sets `globalThis.pdfjsWorker` as a side effect of being loaded (its own
// last line does this), which lets pdfjs detect the worker is already
// available and skip that dynamic import entirely — so just importing it
// for that side effect is enough; no manual wiring needed.
import "pdfjs-dist/legacy/build/pdf.worker.mjs"


function sha256(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function titleFromFilePath(filePath: string) {
  return path.basename(filePath, path.extname(filePath)).replace(/[-_]+/g, " ").trim()
}

function sourceUriFromFilePath(filePath: string) {
  const normalized = path.isAbsolute(filePath) ? path.relative(process.cwd(), filePath) : filePath

  return normalized.split(path.sep).join("/")
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
  const sourceUri = sourceUriFromFilePath(input.filePath)
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
      content: parsed.pages.map(p => p.text).join("\n\n"),
      pages: parsed.pages
    }
    } catch (error) {
      console.error("PDF parse failed:", input.filePath)
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