// src/lib/ingest/toDocumentRecord.ts
import type { NormalizedDocument, JsonValue } from "./normalizeDocument"

type DocumentRecordCreateInput = {
  sourceType: string
  sourceUri: string
  title: string
  checksum: string
  metadata: JsonValue | null
}

export function toDocumentRecordCreateInput(
  doc: NormalizedDocument
): DocumentRecordCreateInput {
  return {
    sourceType: doc.sourceType,
    sourceUri: doc.sourceUri,
    title: doc.title,
    checksum: doc.checksum,
    metadata: {
      ...doc.metadata,
      content: doc.content,
    } as unknown as JsonValue,
  }
}