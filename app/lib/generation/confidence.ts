import type { RetrievedChunk } from "@/app/types"

export type ConfidenceLevel = "strong" | "medium" | "low"

export type ConfidenceResult = {
  level: ConfidenceLevel
  relevantCount: number
  totalCount: number
  reason: string
}

// Heuristic starting points, not empirically calibrated -- QueryRun already
// logs distance per run, so these can be tuned against real usage later.
const RELEVANT_DISTANCE_THRESHOLD = 0.25 // cosine distance; similarity > 0.75 counts as relevant
const STRONG_PRECISION = 0.6
const MEDIUM_PRECISION = 0.3

const GUIDANCE_BY_LEVEL: Record<ConfidenceLevel, string> = {
  strong: "this answer is well-grounded in the source document.",
  medium: "this answer may rely partly on less-relevant context.",
  low: "treat this answer with caution -- it may be incomplete or off-topic.",
}

// Precision@K over the retrieved chunks, using a distance threshold as a
// proxy for "relevant" (there's no ground-truth relevance labeling to
// compute true precision against). Recall isn't used here: it would need
// the count of ALL relevant chunks in the document, which isn't knowable
// without exhaustively scoring every chunk -- precision only needs the
// chunks we already retrieved.
export function computeConfidence(chunks: RetrievedChunk[]): ConfidenceResult {
  const totalCount = chunks.length

  if (totalCount === 0) {
    return { level: "low", relevantCount: 0, totalCount: 0, reason: "No chunks were retrieved for this question." }
  }

  const relevantCount = chunks.filter((chunk) => chunk.distance <= RELEVANT_DISTANCE_THRESHOLD).length
  const precision = relevantCount / totalCount

  const level: ConfidenceLevel =
    precision >= STRONG_PRECISION ? "strong" : precision >= MEDIUM_PRECISION ? "medium" : "low"

  const reason = `${relevantCount} of ${totalCount} retrieved chunks were highly relevant to your question (similarity above 75%) -- ${GUIDANCE_BY_LEVEL[level]}`

  return { level, relevantCount, totalCount, reason }
}
