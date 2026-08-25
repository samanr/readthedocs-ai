export type EvaluationResult = {
  faithfulness: number
  answerRelevancy: number
  precision: number
  reasoning: string
  recall: number | null
  recallReasoning: string | null
}
