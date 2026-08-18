import { RetrievedChunk } from '@/app/types'

export type GenerateAnswerResult = {
  answer: string
  sources: RetrievedChunk[]
}
