import { Fragment, type ReactNode } from "react"

const BOLD_PATTERN = /(\*\*[^*]+\*\*)/g
const UNORDERED_ITEM = /^\s*[-*]\s+/
const ORDERED_ITEM = /^\s*\d+[.)]\s+/

function renderInline(text: string): ReactNode[] {
  return text.split(BOLD_PATTERN).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    )
  )
}

function renderParagraphLines(lines: string[]): ReactNode {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {renderInline(line)}
    </Fragment>
  ))
}

export function FormattedAnswer({ content }: { content: string }) {
  const lines = content.split("\n")
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (UNORDERED_ITEM.test(line)) {
      const items: string[] = []
      while (i < lines.length && UNORDERED_ITEM.test(lines[i])) {
        items.push(lines[i].replace(UNORDERED_ITEM, ""))
        i++
      }
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    if (ORDERED_ITEM.test(line)) {
      const items: string[] = []
      while (i < lines.length && ORDERED_ITEM.test(lines[i])) {
        items.push(lines[i].replace(ORDERED_ITEM, ""))
        i++
      }
      blocks.push(
        <ol key={key++} className="list-decimal space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    if (line.trim() === "") {
      i++
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length && lines[i].trim() !== "" && !UNORDERED_ITEM.test(lines[i]) && !ORDERED_ITEM.test(lines[i])) {
      paragraphLines.push(lines[i])
      i++
    }
    blocks.push(<p key={key++}>{renderParagraphLines(paragraphLines)}</p>)
  }

  return <div className="md-typescale-body-medium space-y-2">{blocks}</div>
}
