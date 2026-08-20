import type { ConfidenceResult } from "@/app/lib/generation/confidence"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: string[]
  confidence?: ConfidenceResult
  isLoading?: boolean
  isError?: boolean
}
