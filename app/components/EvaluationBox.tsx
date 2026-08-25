"use client"

import { useEffect, useRef, useState } from "react"
import { ACCESS_PASSWORD_HEADER } from "@/app/lib/auth/checkAccess"
import type { EvaluationResult } from "@/app/types"
import { getScoreBucketMeta } from "./evaluationScoreColors"

const CHUNK_METRIC_LABELS: { key: "faithfulness" | "answerRelevancy" | "precision"; label: string }[] = [
  { key: "faithfulness", label: "Faithfulness" },
  { key: "answerRelevancy", label: "Relevancy" },
  { key: "precision", label: "Precision" },
]

const RECALL_TRIGGER_THRESHOLD = 0.7

export function EvaluationBox({
  evaluation,
  queryRunId,
  accessPassword,
  onRecallComputed,
}: {
  evaluation: EvaluationResult
  queryRunId: string | null
  accessPassword: string
  onRecallComputed: (recall: number, recallReasoning: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRunningRecall, setIsRunningRecall] = useState(false)
  const [recallError, setRecallError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  async function handleRunRecall() {
    if (!queryRunId || isRunningRecall) return

    setIsRunningRecall(true)
    setRecallError(null)

    try {
      const response = await fetch("/api/ask/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json", [ACCESS_PASSWORD_HEADER]: accessPassword },
        body: JSON.stringify({ queryRunId }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to compute recall.")
      }

      onRecallComputed(data.recall, data.recallReasoning)
    } catch (err) {
      setRecallError(err instanceof Error ? err.message : "Failed to compute recall.")
    } finally {
      setIsRunningRecall(false)
    }
  }

  const showRecallPrompt =
    evaluation.recall === null &&
    (evaluation.faithfulness < RECALL_TRIGGER_THRESHOLD || evaluation.answerRelevancy < RECALL_TRIGGER_THRESHOLD)

  return (
    <div ref={containerRef} className="relative mb-2 inline-block">
      <div className="flex flex-wrap items-center gap-1">
        {CHUNK_METRIC_LABELS.map(({ key, label }) => {
          const score = evaluation[key]
          const { container, onContainer } = getScoreBucketMeta(score)
          return (
            <button
              key={key}
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              className="md-typescale-label-small w-fit cursor-pointer rounded-full border-0 px-2 py-0.5"
              style={{ backgroundColor: container, color: onContainer }}
            >
              {label}: {score.toFixed(2)}
            </button>
          )
        })}

        {evaluation.recall !== null ? (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className="md-typescale-label-small w-fit cursor-pointer rounded-full border-0 px-2 py-0.5"
            style={{
              backgroundColor: getScoreBucketMeta(evaluation.recall).container,
              color: getScoreBucketMeta(evaluation.recall).onContainer,
            }}
          >
            Recall: {evaluation.recall.toFixed(2)}
          </button>
        ) : (
          showRecallPrompt &&
          queryRunId && (
            <button
              type="button"
              onClick={handleRunRecall}
              disabled={isRunningRecall}
              className="md-typescale-label-small w-fit cursor-pointer rounded-full border-0 px-2 py-0.5"
              style={{
                backgroundColor: "var(--md-sys-color-surface-container-highest)",
                color: "var(--md-sys-color-on-surface-variant)",
              }}
            >
              {isRunningRecall ? "Checking recall…" : "Run recall check"}
            </button>
          )
        )}
      </div>

      {recallError && (
        <p className="md-typescale-body-small mt-1" style={{ color: "var(--md-sys-color-error)" }}>
          {recallError}
        </p>
      )}

      {isOpen && (
        <div
          role="tooltip"
          className="md-typescale-body-small absolute left-0 top-full z-10 mt-2 w-72 rounded-lg p-3 shadow-lg"
          style={{
            backgroundColor: "var(--md-sys-color-surface-container-highest)",
            color: "var(--md-sys-color-on-surface)",
          }}
        >
          {evaluation.reasoning}
          {evaluation.recallReasoning && (
            <>
              <br />
              <br />
              {evaluation.recallReasoning}
            </>
          )}
        </div>
      )}
    </div>
  )
}
