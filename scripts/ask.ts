import path from "node:path"
import readline from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { answerQuestion } from "../app/lib/generation/answerQuestion"
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
    console.log("Which document do you want to ask about?")
    documents.forEach((doc, i) => console.log(`  ${i + 1}. ${path.basename(doc.sourceUri)}`))
    const choice = await rl.question("Enter a number: ")
    const index = Number(choice) - 1
    if (!Number.isInteger(index) || index < 0 || index >= documents.length) {
      rl.close()
      throw new Error(`Invalid selection: ${choice}`)
    }
    documentId = documents[index].id
  }

  const question = await rl.question("Enter your question: ")
  rl.close()

  if (!question.trim()) throw new Error("Question cannot be empty")

  const { answer, sources } = await answerQuestion(question, apiKey, documentId, TOP_K)

  console.log(`\nAnswer:\n${answer}`)

  if (sources.length > 0) {
    console.log("\nSources:")
    sources.forEach((source, i) => {
      const fileName = path.basename(source.sourceUri)
      const page = source.metadata?.page ?? "N/A"
      console.log(`  [${i + 1}] ${fileName} (page ${page})`)
    })
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
