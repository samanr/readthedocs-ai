"use client"

import { useEffect, useRef, useState } from "react"
import type { ConfidenceLevel } from "@/app/lib/generation/confidence"

const CONFIDENCE_STYLES: Record<ConfidenceLevel, { label: string; bg: string; fg: string }> = {
  strong: { label: "Confidence: Strong", bg: "var(--md-sys-color-tertiary-container)", fg: "var(--md-sys-color-on-tertiary-container)" },
  medium: { label: "Confidence: Medium", bg: "var(--md-sys-color-secondary-container)", fg: "var(--md-sys-color-on-secondary-container)" },
  low: { label: "Confidence: Low", bg: "var(--md-sys-color-error-container)", fg: "var(--md-sys-color-on-error-container)" },
}

export function ConfidenceBadge({ level, reason }: { level: ConfidenceLevel; reason: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { label, bg, fg } = CONFIDENCE_STYLES[level]

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
    <div ref={containerRef} className="mb-2 inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="md-typescale-label-small w-fit cursor-pointer rounded-full border-0 px-2 py-0.5"
        style={{ backgroundColor: bg, color: fg }}
      >
        {label}
      </button>
      {isOpen && (
        <div
          role="tooltip"
          className="md-typescale-body-small absolute left-full top-0 z-10 ml-2 w-64 rounded-lg p-3 shadow-lg"
          style={{
            backgroundColor: "var(--md-sys-color-surface-container-highest)",
            color: "var(--md-sys-color-on-surface)",
          }}
        >
          {reason}
        </div>
      )}
    </div>
  )
}
