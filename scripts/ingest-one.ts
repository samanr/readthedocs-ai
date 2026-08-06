import path from "node:path"
import readline from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { loadDocument } from "../app/lib/ingest/loadDocument"
import { persistNormalizedDocument } from "../app/lib/ingest/persistDocument"
import { prisma } from "../app/server/db/prisma"

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing")

  const rl = readline.createInterface({ input: stdin, output: stdout })
  const fileName = await rl.question("Enter the document file name (in app/sample-files/): ")
  rl.close()

  if (!fileName.trim()) throw new Error("File name cannot be empty")

  const filePath = path.resolve("app/sample-files", fileName.trim())

  const normalized = await loadDocument(filePath)
  const record = await persistNormalizedDocument(normalized, apiKey)

  const fetched = await prisma.document.findUnique({
    where: { sourceUri: normalized.sourceUri },
    include: { chunks: true },
  })

  if (!fetched) throw new Error("Document was not saved")

  if (fetched.checksum !== normalized.checksum) {
    throw new Error("Checksum mismatch after save")
  }

  console.log({
    normalizedTitle: normalized.title,
    savedId: record.id,
    fetchedChunkCount: fetched.chunks.length,
  })
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })