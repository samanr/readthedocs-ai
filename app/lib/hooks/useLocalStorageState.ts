"use client"

import { useSyncExternalStore } from "react"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emitChange() {
  for (const listener of listeners) listener()
}

export function useLocalStorageState(key: string, defaultValue: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? defaultValue,
    () => defaultValue
  )

  function setValue(next: string) {
    localStorage.setItem(key, next)
    emitChange()
  }

  return [value, setValue] as const
}
