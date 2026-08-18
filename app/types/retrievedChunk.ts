import { JsonValue } from '@/app/types'

export type RetrievedChunk = {
  chunkId: string
  documentId: string
  chunkIndex: number
  content: string
  metadata: Record<string, JsonValue>
  documentTitle: string | null
  sourceUri: string
  distance: number
}
