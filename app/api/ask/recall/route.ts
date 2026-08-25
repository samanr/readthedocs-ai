import { NextResponse } from "next/server"
import { isAccessAllowed } from "@/app/lib/auth/checkAccess"
import { evaluateRecall } from "@/app/lib/generation/evaluateAnswer"
import { getGeminiApiKey } from "@/app/lib/gemini/client"
import { getQueryRunForRecall, updateQueryRunRecall } from "@/app/lib/observability/logQueryRun"

// On-demand only -- triggered by the "run recall check" progressive-
// disclosure action in the UI when faithfulness/relevancy look off, not
// run automatically for every answer (see answerQuestion.ts).
export async function POST(request: Request) {
  if (!isAccessAllowed(request)) {
    return NextResponse.json({ error: "Invalid or missing access password." }, { status: 401 })
  }

  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing GEMINI_API_KEY." }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const queryRunId = typeof body?.queryRunId === "string" ? body.queryRunId : undefined

  if (!queryRunId) {
    return NextResponse.json({ error: "Missing queryRunId." }, { status: 400 })
  }

  const run = await getQueryRunForRecall(queryRunId)
  if (!run) {
    return NextResponse.json({ error: "Query run not found." }, { status: 404 })
  }

  try {
    const { recall, recallReasoning } = await evaluateRecall(run.question, run.retrievedChunks, apiKey)
    await updateQueryRunRecall(queryRunId, recall, recallReasoning)

    return NextResponse.json({ recall, recallReasoning })
  } catch (error) {
    console.error("Failed to compute recall:", error)
    return NextResponse.json({ error: "Failed to compute recall. Try again." }, { status: 502 })
  }
}
