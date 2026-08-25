import type { EvaluationResult } from "@/app/types"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: string[]
  evaluation?: EvaluationResult | null
  isLoading?: boolean
  isError?: boolean
}
