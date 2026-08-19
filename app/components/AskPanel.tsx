"use client"

import { useRef, useState } from "react"
import "@material/web/button/outlined-button.js"
import "@material/web/iconbutton/icon-button.js"
import "@material/web/progress/circular-progress.js"
import "@material/web/textfield/outlined-text-field.js"
import { ACCESS_PASSWORD_HEADER } from "@/app/lib/auth/checkAccess"
import type { ChatMessage, UploadedDocument } from "@/app/types"
import { ConfidenceBadge } from "./ConfidenceBadge"
import { FormattedAnswer } from "./FormattedAnswer"
import { SendIcon } from "./icons"

type TextFieldElement = HTMLElement & { value: string }

export function AskPanel({
  accessPassword,
  uploadedDocument,
  messages,
  onMessagesChange,
  onGoToHome,
}: {
  accessPassword: string
  uploadedDocument: UploadedDocument | null
  messages: ChatMessage[]
  onMessagesChange: (update: (prev: ChatMessage[]) => ChatMessage[]) => void
  onGoToHome: () => void
}) {
  const [isSending, setIsSending] = useState(false)
  const inputRef = useRef<TextFieldElement>(null)

  if (!uploadedDocument) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="md-typescale-body-medium">Upload a document before asking questions.</p>
        <md-outlined-button className="p-2" onClick={onGoToHome}>
          <span className="font-bold">Home</span>
        </md-outlined-button>
      </div>
    )
  }

  async function handleSend() {
    if (isSending) return

    const question = inputRef.current?.value.trim()
    if (!question) return

    inputRef.current!.value = ""
    setIsSending(true)

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question }
    const loadingId = crypto.randomUUID()
    const loadingMessage: ChatMessage = { id: loadingId, role: "assistant", content: "", isLoading: true }
    onMessagesChange((prev) => [...prev, userMessage, loadingMessage])

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", [ACCESS_PASSWORD_HEADER]: accessPassword },
        body: JSON.stringify({ question, documentId: uploadedDocument!.id }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate an answer.")
      }

      onMessagesChange((prev) =>
        prev.map((message) =>
          message.id === loadingId
            ? {
                ...message,
                content: data.answer,
                citations: data.citations,
                confidence: data.confidence,
                isLoading: false,
              }
            : message
        )
      )
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Failed to generate an answer."
      onMessagesChange((prev) =>
        prev.map((message) =>
          message.id === loadingId ? { ...message, content: errorText, isLoading: false, isError: true } : message
        )
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-8">
      <p
        className="md-typescale-label-large pb-3"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
      >
        Asking about: <span className="font-bold">{uploadedDocument.title}</span>
      </p>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="relative max-w-[80%] rounded-2xl px-4 py-3"
              style={{
                backgroundColor: message.isError
                  ? "var(--md-sys-color-error-container)"
                  : message.role === "user"
                    ? "var(--md-sys-color-primary-container)"
                    : "var(--md-sys-color-surface-container)",
                color: message.isError
                  ? "var(--md-sys-color-on-error-container)"
                  : message.role === "user"
                    ? "var(--md-sys-color-on-primary-container)"
                    : "var(--md-sys-color-on-surface)",
              }}
            >
              {message.isLoading ? (
                <md-circular-progress
                  indeterminate
                  style={{ "--md-circular-progress-size": "20px" } as React.CSSProperties}
                />
              ) : message.role === "assistant" ? (
                <>
                  {message.confidence && !message.isError && (
                    <ConfidenceBadge level={message.confidence.level} reason={message.confidence.reason} />
                  )}
                  <FormattedAnswer content={message.content} />
                  {message.citations && message.citations.length > 0 && (
                    <p className="md-typescale-body-small mt-1 opacity-70">[{message.citations.join(", ")}]</p>
                  )}
                </>
              ) : (
                <p className="md-typescale-body-medium">{message.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 pt-8">
        <md-outlined-text-field
          ref={inputRef}
          className="flex-1"
          label="Ask a question"
          placeholder={`Ask about ${uploadedDocument.title}`}
          disabled={isSending}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              handleSend()
            }
          }}
        />
        <md-icon-button title="Send" aria-label="Send" disabled={isSending} onClick={handleSend}>
          <SendIcon />
        </md-icon-button>
      </div>
    </div>
  )
}
