import { NextResponse } from "next/server"
import { isAccessAllowed } from "@/app/lib/auth/checkAccess"
import { computeConfidence } from "@/app/lib/generation/confidence"
import { answerQuestion } from "@/app/lib/generation/answerQuestion"
import { getOpenAIApiKey } from "@/app/lib/openai/client"
import type { RetrievedChunk } from "@/app/types"

function citationLabel(chunk: RetrievedChunk): string {
  const page = chunk.metadata?.page
  const heading = chunk.metadata?.heading
  if (typeof page === "number") return `Page ${page}`
  if (typeof heading === "string") return heading
  return chunk.documentTitle ?? chunk.sourceUri
}

export async function POST(request: Request) {
  if (!isAccessAllowed(request)) {
    return NextResponse.json({ error: "Invalid or missing access password." }, { status: 401 })
  }

  const apiKey = getOpenAIApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing OPENAI_API_KEY." }, { status: 500 })
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body.question !== "string" || !body.question.trim()) {
    return NextResponse.json({ error: "Missing question." }, { status: 400 })
  }

  const documentId = typeof body.documentId === "string" ? body.documentId : undefined
  const topK = typeof body.topK === "number" ? body.topK : undefined

  try {
    const result = await answerQuestion(body.question, apiKey, documentId, topK)
    const citations = [...new Set(result.sources.map(citationLabel))]
    const confidence = computeConfidence(result.sources)

    return NextResponse.json({ answer: result.answer, citations, confidence })
  } catch (error) {
    console.error("Failed to answer question:", error)
    return NextResponse.json(
      { error: "Failed to generate an answer. Check your API key and try again." },
      { status: 502 }
    )
  }
}
