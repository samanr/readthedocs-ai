"use client"

import { useEffect, useRef, useState } from "react"
import type { EvaluationResult } from "@/app/types"
import { getScoreBucketMeta } from "./evaluationScoreColors"

const METRIC_LABELS: { key: keyof Omit<EvaluationResult, "reasoning">; label: string }[] = [
  { key: "faithfulness", label: "Faithfulness" },
  { key: "answerRelevancy", label: "Relevancy" },
  { key: "precision", label: "Precision" },
  { key: "recall", label: "Recall" },
]

export function EvaluationBox({ evaluation }: { evaluation: EvaluationResult }) {
  const [isOpen, setIsOpen] = useState(false)
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

  return (
    <div ref={containerRef} className="relative mb-2 inline-block">
      <div className="flex flex-wrap gap-1">
        {METRIC_LABELS.map(({ key, label }) => {
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
      </div>
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
        </div>
      )}
    </div>
  )
}
