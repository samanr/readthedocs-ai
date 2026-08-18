"use client"

import { useRef, useState, type ChangeEvent } from "react"
import "@material/web/button/filled-button.js"
import "@material/web/button/outlined-button.js"
import "@material/web/divider/divider.js"
import "@material/web/iconbutton/icon-button.js"
import "@material/web/labs/navigationbar/navigation-bar.js"
import "@material/web/labs/navigationtab/navigation-tab.js"
import "@material/web/textfield/outlined-text-field.js"
import { Logo } from "./components/Logo"
import { ThemeToggle } from "./components/ThemeToggle"
import { AskIcon, HomeIcon, RefreshIcon, RepeatIcon, SendIcon, UploadIcon } from "./components/icons"

type NavKey = "home" | "ask"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: string[]
}

type TextFieldElement = HTMLElement & { value: string }

const NAV_ITEMS: { key: NavKey; label: string; icon: React.ReactNode }[] = [
  { key: "home", label: "Home", icon: <HomeIcon /> },
  { key: "ask", label: "Ask", icon: <AskIcon /> },
]

export default function Home() {
  const [active, setActive] = useState<NavKey>("home")
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  function handleUpload(fileName: string) {
    setUploadedFileName(fileName)
    setActive("ask")
  }

  function handleReadAnotherDoc() {
    setUploadedFileName(null)
    setActive("home")
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative">
        <md-navigation-bar active-index={NAV_ITEMS.findIndex((item) => item.key === active)}>
          {NAV_ITEMS.map((item) => (
            <md-navigation-tab
              key={item.key}
              label={item.label}
              active={item.key === active}
              onClick={() => setActive(item.key)}
            >
              <span slot="active-icon">{item.icon}</span>
              <span slot="inactive-icon">{item.icon}</span>
            </md-navigation-tab>
          ))}
        </md-navigation-bar>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <ThemeToggle />
        </div>
      </div>

      <md-divider />

      <main className="relative flex flex-1 flex-col items-center justify-center">
        <button
          type="button"
          onClick={handleReadAnotherDoc}
          className="absolute right-4 top-4 flex items-center gap-2"
          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        >
          <RefreshIcon size={20} />
          <span className="md-typescale-label-medium">Read Another Doc!</span>
        </button>

        {active === "home" ? (
          <HomePanel uploadedFileName={uploadedFileName} onUpload={handleUpload} />
        ) : (
          <AskPanel uploadedFileName={uploadedFileName} onGoToHome={() => setActive("home")} />
        )}
      </main>
    </div>
  )
}

function HomePanel({
  uploadedFileName,
  onUpload,
}: {
  uploadedFileName: string | null
  onUpload: (fileName: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onUpload(file.name)
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
          Upload a document, then ask grounded questions about it.
        </p>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <md-filled-card className="flex items-center justify-center p-8">
          <md-filled-button className="p-2" onClick={() => fileInputRef.current?.click()}>
            <span slot="icon">
              <UploadIcon size={18} />
            </span>
            <span className="font-bold">Upload document</span>
          </md-filled-button>
        </md-filled-card>
        {uploadedFileName && <p className="md-typescale-body-small">Uploaded: {uploadedFileName}</p>}
      </div>
    </div>
  )
}

function AskPanel({
  uploadedFileName,
  onGoToHome,
}: {
  uploadedFileName: string | null
  onGoToHome: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const inputRef = useRef<TextFieldElement>(null)

  if (!uploadedFileName) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="md-typescale-body-medium">Upload a document before asking questions.</p>
        <md-outlined-button  className="p-2" onClick={onGoToHome}><span className="font-bold">Home</span></md-outlined-button>
      </div>
    )
  }

  function handleSend() {
    const question = inputRef.current?.value.trim()
    if (!question) return

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question }
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "This is a placeholder answer based on the uploaded document.",
      citations: ["Page 1", "Page 2"],
    }
    setMessages((prev) => [...prev, userMessage, assistantMessage])
    inputRef.current!.value = ""
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-8">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3"
              style={{
                backgroundColor:
                  message.role === "user"
                    ? "var(--md-sys-color-primary-container)"
                    : "var(--md-sys-color-surface-container)",
                color:
                  message.role === "user"
                    ? "var(--md-sys-color-on-primary-container)"
                    : "var(--md-sys-color-on-surface)",
              }}
            >
              <p className="md-typescale-body-medium">
                {message.content}
                {message.citations && message.citations.length > 0 && (
                  <span className="ml-1 opacity-70">[{message.citations.join(", ")}]</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 pt-8">
        <md-outlined-text-field
          ref={inputRef}
          className="flex-1"
          label="Ask a question"
          placeholder={`Ask about ${uploadedFileName}`}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              handleSend()
            }
          }}
        />
        <md-icon-button title="Send" aria-label="Send" onClick={handleSend}>
          <SendIcon />
        </md-icon-button>
      </div>
    </div>
  )
}
