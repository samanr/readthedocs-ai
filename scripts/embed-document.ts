import readline from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { embedChunksForDocument } from "../app/lib/ingest/embedChunks"
import { prisma } from "../app/server/db/prisma"

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing")

  const rl = readline.createInterface({ input: stdin, output: stdout })
  const fileName = await rl.question("Enter the document file name (in app/sample-files/): ")
  rl.close()

  if (!fileName.trim()) throw new Error("File name cannot be empty")

  const sourceUri = `app/sample-files/${fileName.trim()}`

  const document = await prisma.document.findUnique({ where: { sourceUri } })
  if (!document) {
    throw new Error(`No ingested document found for ${sourceUri}. Run "pnpm ingest:one" first.`)
  }

  await embedChunksForDocument(document.id, apiKey)

  const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) AS count FROM "Chunk" WHERE "documentId" = ${document.id} AND embedding IS NOT NULL
  `

  console.log({
    documentId: document.id,
    sourceUri: document.sourceUri,
    embeddedChunks: Number(count),
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
