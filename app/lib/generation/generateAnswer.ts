import { ChatOpenAI } from "@langchain/openai"
import type { GenerateAnswerResult, RetrievedChunk } from "@/app/types"

export const GENERATION_MODEL = "gpt-5.6-luna"
const MAX_TOKENS = 500

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

export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[],
  apiKey: string
): Promise<GenerateAnswerResult> {
  if (chunks.length === 0) {
    return { answer: NO_CONTEXT_ANSWER, sources: [] }
  }

  const chat = new ChatOpenAI({ apiKey, model: GENERATION_MODEL, maxTokens: MAX_TOKENS })

  const response = await chat.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Context:\n${formatContext(chunks)}\n\nQuestion: ${question}` },
  ])

  return { answer: extractText(response.content), sources: chunks }
}
