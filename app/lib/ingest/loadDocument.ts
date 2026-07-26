import { readFile } from "node:fs/promises"
import path from "node:path"
import { normalizeDocument } from "./normalizeDocument"

export async function loadDocument(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === ".pdf") {
    const buffer = await readFile(filePath)
    console.log('coming here')
    return normalizeDocument({ filePath, buffer })
  }

  const rawContent = await readFile(filePath, "utf8")
  return normalizeDocument({ filePath, rawContent })
}