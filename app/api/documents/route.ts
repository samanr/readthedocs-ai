import { NextResponse } from "next/server"
import { isAccessAllowed } from "@/app/lib/auth/checkAccess"
import { normalizeDocument } from "@/app/lib/ingest/normalizeDocument"
import { persistNormalizedDocument } from "@/app/lib/ingest/persistDocument"

const SUPPORTED_EXTENSIONS = [".md", ".txt", ".pdf"]
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

function extensionOf(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".")
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase()
}

export async function POST(request: Request) {
  if (!isAccessAllowed(request)) {
    return NextResponse.json({ error: "Invalid or missing access password." }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing OPENAI_API_KEY." }, { status: 500 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 })
  }

  const extension = extensionOf(file.name)
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      { error: `Unsupported file type "${extension}". Supported types: ${SUPPORTED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    )
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
      { status: 413 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const normalized =
      extension === ".pdf"
        ? await normalizeDocument({ filePath: file.name, buffer })
        : await normalizeDocument({ filePath: file.name, rawContent: buffer.toString("utf8") })

    const document = await persistNormalizedDocument(normalized, apiKey)

    return NextResponse.json(
      {
        id: document.id,
        title: document.title,
        sourceUri: document.sourceUri,
        sourceType: document.sourceType,
        duplicate: document.isDuplicate,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to ingest document:", error)
    return NextResponse.json(
      { error: "Failed to process the document. Check your API key and try again." },
      { status: 502 }
    )
  }
}
