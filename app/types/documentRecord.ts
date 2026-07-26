// src/types/normalized-document.ts

export type DocumentRecord = {
  sourceType: "md" | "txt" | "pdf"
  sourceUri?: string | null
  title?: string | null
  checksum?: string | null
  metadata?: JsonValue | null
  createdAt: Date
  updatedAt: Date
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }