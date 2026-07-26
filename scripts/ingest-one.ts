import path from "node:path"
import { loadDocument } from "../app/lib/ingest/loadDocument"
import { prisma } from "../app/server/db/prisma"

async function main() {
  const filePath = path.resolve("app/sample-files/demo1.pdf")

  const normalized = await loadDocument(filePath)

  const record = await prisma.document.upsert({
    where: { checksum: normalized.checksum },
    update: {
      sourceType: normalized.sourceType,
      sourceUri: normalized.sourceUri,
      title: normalized.title,
      metadata: normalized.metadata,
    },
    create: {
      sourceType: normalized.sourceType,
      sourceUri: normalized.sourceUri,
      title: normalized.title,
      checksum: normalized.checksum,
      metadata: normalized.metadata,
    },
  })

  const fetched = await prisma.document.findUnique({
    where: { checksum: normalized.checksum },
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