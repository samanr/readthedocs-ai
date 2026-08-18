import path from "node:path"
import readline from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { retrieveRelevantChunks } from "../app/lib/retrieval/retrieveChunks"
import { prisma } from "../app/server/db/prisma"

const TOP_K = 5

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing")

  const documents = await prisma.document.findMany({ select: { id: true, sourceUri: true } })
  if (documents.length === 0) throw new Error("No documents have been ingested yet")

  const rl = readline.createInterface({ input: stdin, output: stdout })

  let documentId: string
  if (documents.length === 1) {
    documentId = documents[0].id
    console.log(`Using the only ingested document: ${path.basename(documents[0].sourceUri)}`)
  } else {
    console.log("Which document do you want to search?")
    documents.forEach((doc, i) => console.log(`  ${i + 1}. ${path.basename(doc.sourceUri)}`))
    const choice = await rl.question("Enter a number: ")
    const index = Number(choice) - 1
    if (!Number.isInteger(index) || index < 0 || index >= documents.length) {
      rl.close()
      throw new Error(`Invalid selection: ${choice}`)
    }
    documentId = documents[index].id
  }

  const query = await rl.question("Enter your query: ")
  rl.close()

  if (!query.trim()) throw new Error("Query cannot be empty")

  const results = await retrieveRelevantChunks(query, apiKey, TOP_K, documentId)

  if (results.length === 0) {
    console.log("No results found.")
    return
  }

  results.forEach((result, i) => {
    const fileName = path.basename(result.sourceUri)
    const page = result.metadata?.page ?? "N/A"
    console.log(`\n#${i + 1} — ${fileName} (page ${page}, distance ${result.distance.toFixed(4)})`)
    console.log(result.content.slice(0, 200).trim() + (result.content.length > 200 ? "..." : ""))
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
