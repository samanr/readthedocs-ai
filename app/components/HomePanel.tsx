"use client"

import { useRef, useState, type ChangeEvent } from "react"
import "@material/web/button/filled-button.js"
import "@material/web/button/outlined-button.js"
import "@material/web/labs/card/filled-card.js"
import "@material/web/progress/circular-progress.js"
import "@material/web/textfield/outlined-text-field.js"
import { ACCESS_PASSWORD_HEADER } from "@/app/lib/auth/checkAccess"
import type { UploadedDocument } from "@/app/types"
import { Logo } from "./Logo"
import { RepeatIcon, UploadIcon } from "./icons"

type TextFieldElement = HTMLElement & { value: string }

export function HomePanel({
  accessPassword,
  onAccessPasswordChange,
  onUpload,
}: {
  accessPassword: string
  onAccessPasswordChange: (value: string) => void
  onUpload: (document: UploadedDocument) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDuplicate, setPendingDuplicate] = useState<UploadedDocument | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError(null)
    setPendingDuplicate(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { [ACCESS_PASSWORD_HEADER]: accessPassword },
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to upload document.")
      }

      const document: UploadedDocument = { id: data.id, title: data.title }

      // The parent switches tabs to the Ask panel the instant onUpload
      // fires, which would unmount this panel before the notice is ever
      // seen -- so hold off and let the user acknowledge it first.
      if (data.duplicate) {
        setPendingDuplicate(document)
      } else {
        onUpload(document)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex w-fit flex-col items-center gap-10">
      <Logo />
      <div
        className="flex w-fit flex-col items-center gap-4 rounded-2xl p-8 shadow-lg"
        style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}
      >
        <h1 className="md-typescale-title-large flex items-center gap-2" style={{ textTransform: "uppercase" }}>
          <RepeatIcon size={26} /> 1 document · unlimited questions
        </h1>
        <p className="md-typescale-body-large text-center">
          Upload a document, then ask grounded questions about it. Max: [4MB]
        </p>
        <md-outlined-text-field
          className="w-56"
          type="password"
          label="Access password"
          placeholder="Only if required"
          value={accessPassword}
          onInput={(event) => onAccessPasswordChange((event.currentTarget as TextFieldElement).value)}
        />
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        {pendingDuplicate ? (
          <div className="flex w-56 flex-col items-center gap-3 text-center">
            <p className="md-typescale-body-small" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
              This file&apos;s content matches an existing document: <strong>{pendingDuplicate.title}</strong>.
              Continuing that chat instead of re-ingesting it.
            </p>
            <div className="flex gap-2">
              <md-outlined-button className="p-2" onClick={() => setPendingDuplicate(null)}>
                <span className="font-bold">Cancel</span>
              </md-outlined-button>
              <md-filled-button className="p-2" onClick={() => onUpload(pendingDuplicate)}>
                <span className="font-bold">Continue to chat</span>
              </md-filled-button>
            </div>
          </div>
        ) : (
          <md-filled-card className="flex items-center justify-center p-8">
            <md-filled-button
              className="p-2"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <span slot="icon">
                  <md-circular-progress
                    indeterminate
                    style={{ "--md-circular-progress-size": "18px" } as React.CSSProperties}
                  />
                </span>
              ) : (
                <span slot="icon">
                  <UploadIcon size={18} />
                </span>
              )}
              <span className="font-bold">{isUploading ? "Uploading…" : "Upload document"}</span>
            </md-filled-button>
          </md-filled-card>
        )}
        {error && (
          <p className="md-typescale-body-small" style={{ color: "var(--md-sys-color-error)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
