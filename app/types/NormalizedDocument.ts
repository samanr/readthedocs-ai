export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type NormalizedDocument = {
  sourceType: "md" | "txt" | "pdf"
  sourceUri: string
  title: string
  checksum: string
  metadata: Record<string, JsonValue>
  content: string
  pages? : Array<{num: number; text: string }>
}

export type NormalizeInput = {
  filePath: string
  rawContent?: string
  buffer?: Buffer
}
