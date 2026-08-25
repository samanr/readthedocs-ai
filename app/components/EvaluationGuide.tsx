"use client"

import { useState } from "react"
import { SCORE_BUCKETS } from "./evaluationScoreColors"

const METRICS: { label: string; description: string }[] = [
  {
    label: "Faithfulness",
    description: "Are the answer's claims backed by the retrieved text? Low = possible hallucination.",
  },
  {
    label: "Relevancy",
    description: "Does the answer actually address your question, grounded or not?",
  },
  {
    label: "Precision",
    description:
      "Of the chunks retrieved, how many were actually needed for this answer? Noise here doesn't mean the answer is wrong.",
  },
  {
    label: "Recall",
    description: "Did retrieval capture everything in the document relevant to your question?",
  },
]

export function EvaluationGuide() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <aside
      className="hidden w-72 shrink-0 flex-col gap-4 self-start rounded-2xl p-5 lg:flex"
      style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}
    >
      <div>
        <h2 className="md-typescale-title-small">Evaluation scores</h2>
        <p className="md-typescale-body-small mt-1" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
          Each answer is scored 0.0–1.0 by a separate judge model. Higher is always better.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="md-typescale-label-medium mt-3 w-full cursor-pointer rounded-full border-0 px-3 py-1.5"
          style={{
            backgroundColor: "var(--md-sys-color-secondary-container)",
            color: "var(--md-sys-color-on-secondary-container)",
          }}
        >
          {isOpen ? "Hide details" : "More about the evaluation scores"}
        </button>
      </div>

      {isOpen && (
        <>
          <dl className="flex flex-col gap-3">
            {METRICS.map(({ label, description }) => (
              <div key={label}>
                <dt className="md-typescale-label-medium font-bold">{label}</dt>
                <dd
                  className="md-typescale-body-small mt-0.5"
                  style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                >
                  {description}
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <h3 className="md-typescale-label-medium font-bold">Why 0.0 to 1.0?</h3>
            <p
              className="md-typescale-body-small mt-0.5"
              style={{ color: "var(--md-sys-color-on-surface-variant)" }}
            >
              All four metrics share the same scale so they&apos;re directly comparable even though they measure
              different things. <strong>1.0</strong> means the criterion is fully met — every claim grounded, every
              retrieved chunk actually needed, nothing relevant missed. <strong>0.0</strong> means it isn&apos;t met
              at all. Values in between are partial credit: 0.5 roughly means half of the claims, chunks, or
              coverage met the bar — not a coin flip on whether the answer is right.
            </p>
          </div>

          <div>
            <h3 className="md-typescale-label-medium font-bold">What counts as good?</h3>
            <p
              className="md-typescale-body-small mt-0.5 mb-2"
              style={{ color: "var(--md-sys-color-on-surface-variant)" }}
            >
              Rough guide, not a hard cutoff — this is the same color key used on the scores themselves:
            </p>
            <div className="flex flex-col gap-1.5">
              {SCORE_BUCKETS.map(({ bucket, range, meaning, container, onContainer }) => (
                <div key={bucket} className="flex items-center gap-2">
                  <span
                    className="md-typescale-label-small w-24 shrink-0 rounded-full px-2 py-0.5 text-center"
                    style={{ backgroundColor: container, color: onContainer }}
                  >
                    {range}
                  </span>
                  <span className="md-typescale-body-small" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
                    {meaning}
                  </span>
                </div>
              ))}
            </div>
            <p
              className="md-typescale-body-small mt-2"
              style={{ color: "var(--md-sys-color-on-surface-variant)" }}
            >
              Faithfulness and relevancy matter most — a low precision or recall on its own often just reflects
              retrieval noise or scope, not a wrong answer.
            </p>
          </div>

          <p className="md-typescale-body-small" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
            These are LLM-judged estimates, not ground truth — treat a single score as directional, not exact.
          </p>
        </>
      )}
    </aside>
  )
}
