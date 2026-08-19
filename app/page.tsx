"use client"

import { useState } from "react"
import "@material/web/divider/divider.js"
import "@material/web/labs/navigationbar/navigation-bar.js"
import "@material/web/labs/navigationtab/navigation-tab.js"
import { AskPanel } from "./components/AskPanel"
import { HomePanel } from "./components/HomePanel"
import { ThemeToggle } from "./components/ThemeToggle"
import { AskIcon, HomeIcon, RefreshIcon } from "./components/icons"
import { useLocalStorageState } from "@/app/lib/hooks/useLocalStorageState"
import type { ChatMessage, UploadedDocument } from "@/app/types"

type NavKey = "home" | "ask"

const ACCESS_PASSWORD_STORAGE_KEY = "app_access_password"

const NAV_ITEMS: { key: NavKey; label: string; icon: React.ReactNode }[] = [
  { key: "home", label: "Home", icon: <HomeIcon /> },
  { key: "ask", label: "Ask", icon: <AskIcon /> },
]

export default function Home() {
  const [active, setActive] = useState<NavKey>("home")
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [accessPassword, setAccessPassword] = useLocalStorageState(ACCESS_PASSWORD_STORAGE_KEY, "")

  function handleUpload(document: UploadedDocument) {
    setUploadedDocument(document)
    setActive("ask")
  }

  function handleReadAnotherDoc() {
    setUploadedDocument(null)
    setMessages([])
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

      <main className="relative flex flex-1 flex-col items-center pt-16">
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
          <HomePanel
            accessPassword={accessPassword}
            onAccessPasswordChange={setAccessPassword}
            onUpload={handleUpload}
          />
        ) : (
          <AskPanel
            accessPassword={accessPassword}
            uploadedDocument={uploadedDocument}
            messages={messages}
            onMessagesChange={setMessages}
            onGoToHome={() => setActive("home")}
          />
        )}
      </main>
    </div>
  )
}
