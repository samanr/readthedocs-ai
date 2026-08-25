import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

// Free-tier judge model -- generation stays on the paid OPENAI_API_KEY model,
// evaluation runs on a separate free-tier provider so scoring every answer
// doesn't add to the OpenAI bill.
export const JUDGE_MODEL = "gemini-3.1-flash-lite"

export function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null
}

let cachedJudgeClient: { apiKey: string; client: ChatGoogleGenerativeAI } | null = null

export function getJudgeClient(apiKey: string): ChatGoogleGenerativeAI {
  if (cachedJudgeClient?.apiKey !== apiKey) {
    cachedJudgeClient = { apiKey, client: new ChatGoogleGenerativeAI({ apiKey, model: JUDGE_MODEL }) }
  }
  return cachedJudgeClient.client
}
