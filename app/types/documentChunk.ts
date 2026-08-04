import { JsonValue } from '@/app/types'

export type DocumentChunk = {
  chunkIndex: number
  content: string
  metadata: Record<string, JsonValue>
}
