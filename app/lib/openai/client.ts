import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"

export const EMBEDDING_MODEL = "text-embedding-3-small"
export const GENERATION_MODEL = "gpt-5.6-luna"
const MAX_TOKENS = 500

export function getOpenAIApiKey(): string | null {
  return process.env.OPENAI_API_KEY || null
}

// Cached rather than constructed per call -- there's currently only ever
// one apiKey in play (the shared server key from OPENAI_API_KEY), so
// reconstructing on every request is pure waste. Keyed by apiKey so a
// future per-request key (BYOK, see README) can't get served a client
// built for someone else's key.
let cachedEmbeddingsClient: { apiKey: string; client: OpenAIEmbeddings } | null = null

export function getEmbeddingsClient(apiKey: string): OpenAIEmbeddings {
  if (cachedEmbeddingsClient?.apiKey !== apiKey) {
    cachedEmbeddingsClient = { apiKey, client: new OpenAIEmbeddings({ apiKey, model: EMBEDDING_MODEL }) }
  }
  return cachedEmbeddingsClient.client
}

let cachedChatClient: { apiKey: string; client: ChatOpenAI } | null = null

export function getChatClient(apiKey: string): ChatOpenAI {
  if (cachedChatClient?.apiKey !== apiKey) {
    cachedChatClient = { apiKey, client: new ChatOpenAI({ apiKey, model: GENERATION_MODEL, maxTokens: MAX_TOKENS }) }
  }
  return cachedChatClient.client
}
