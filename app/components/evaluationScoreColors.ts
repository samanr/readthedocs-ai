export type ScoreBucket = "good" | "medium" | "bad"

export type ScoreBucketMeta = {
  bucket: ScoreBucket
  min: number
  range: string
  meaning: string
  container: string
  onContainer: string
}

// Single source of truth for score -> color/label, shared by EvaluationBox
// (the per-answer badges) and EvaluationGuide (the color key) so they can
// never drift out of sync with each other. Ordered highest-min first so
// getScoreBucketMeta's find() picks the right bucket.
export const SCORE_BUCKETS: ScoreBucketMeta[] = [
  {
    bucket: "good",
    min: 0.7,
    range: "0.7 – 1.0",
    meaning: "Strong",
    container: "var(--md-extended-color-success-container)",
    onContainer: "var(--md-extended-color-on-success-container)",
  },
  {
    bucket: "medium",
    min: 0.4,
    range: "0.4 – 0.7",
    meaning: "Worth a second look",
    container: "var(--md-sys-color-secondary-container)",
    onContainer: "var(--md-sys-color-on-secondary-container)",
  },
  {
    bucket: "bad",
    min: 0,
    range: "0.0 – 0.4",
    meaning: "Likely a problem",
    container: "var(--md-sys-color-error-container)",
    onContainer: "var(--md-sys-color-on-error-container)",
  },
]

export function getScoreBucketMeta(score: number): ScoreBucketMeta {
  return SCORE_BUCKETS.find((entry) => score >= entry.min) ?? SCORE_BUCKETS[SCORE_BUCKETS.length - 1]
}
