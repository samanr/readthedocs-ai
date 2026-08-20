import { GENERATION_MODEL, getChatClient } from "@/app/lib/openai/client"
import type { GenerateAnswerResult, RetrievedChunk } from "@/app/types"

export { GENERATION_MODEL }

const NO_CONTEXT_ANSWER = "I don't have any relevant information to answer that."

const SYSTEM_PROMPT = [
  "You are a helpful assistant that answers questions using only the numbered context provided below.",
  "Cite the sources you use with their [n] label.",
  "If the answer is not contained in the context, say so plainly instead of guessing.",
].join(" ")

function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, i) => {
      const page = chunk.metadata?.page
      const heading = chunk.metadata?.heading
      const location = page ? `page ${page}` : heading ? `section "${heading}"` : undefined
      const source = chunk.documentTitle ?? chunk.sourceUri
      const label = location ? `${source} — ${location}` : source

      return `[${i + 1}] (${label})\n${chunk.content}`
    })
    .join("\n\n")
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "object" && part !== null && "text" in part ? String(part.text) : ""))
      .join("")
  }
  return ""
}

// The model is prompted to ground claims with [n] markers referencing the
// numbered context (see SYSTEM_PROMPT) -- this improves groundedness, but
// the markers don't correspond to anything meaningful once rendered (they
// point at context rank, not the citations list shown in the UI), so strip
// them from what's actually displayed.
function stripCitationMarkers(text: string): string {
  return text.replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, "").replace(/ {2,}/g, " ")
}

export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[],
  apiKey: string
): Promise<GenerateAnswerResult> {
  if (chunks.length === 0) {
    return { answer: NO_CONTEXT_ANSWER, sources: [] }
  }

  const chat = getChatClient(apiKey)

  const response = await chat.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Context:\n${formatContext(chunks)}\n\nQuestion: ${question}` },
  ])

  return { answer: stripCitationMarkers(extractText(response.content)), sources: chunks }
}
