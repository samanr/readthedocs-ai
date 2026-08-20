"use client"

import { useSyncExternalStore } from "react"

type Theme = "light" | "dark"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emitChange() {
  for (const listener of listeners) listener()
}

function getSnapshot(): Theme | null {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
}

function getServerSnapshot(): Theme | null {
  // Avoid a hydration mismatch: the real theme is only known once the
  // anti-flash script (in layout.tsx) has set data-theme on <html>.
  return null
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem("theme", next)
    emitChange()
  }

  if (theme === null) {
    return <div className="h-10 w-10" aria-hidden="true" />
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
      style={{
        borderColor: "var(--md-sys-color-outline-variant)",
        color: "var(--md-sys-color-on-surface)",
        backgroundColor: "var(--md-sys-color-surface-container)",
      }}
    >
      {theme === "dark" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  )
}
