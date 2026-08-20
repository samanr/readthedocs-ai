<p align="center">
  <img src="public/readmydocs.png" alt="ReadMyDocs AI logo" width="120" />
</p>

# ReadMyDocs AI

ReadMyDocs AI is a grounded document Q&A app built with Next.js, Prisma, PostgreSQL, and pgvector.

Upload a document, then ask questions about it in natural language. Answers are generated only from the chunks retrieved for that question, with inline citations back to the page or section they came from.

<video width="640" height="360" controls preload>
  <source src="public/ui-demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>


## What this project does

- ✅ Load and ingest documents (Markdown, plain text, PDF).
- ✅ Split documents into structure-aware chunks (per-page for PDF, per-heading for Markdown).
- ✅ Create embeddings for each chunk (OpenAI `text-embedding-3-small`).
- ✅ Store chunks and embeddings in PostgreSQL with pgvector.
- ✅ Retrieve relevant chunks for a user question (pgvector cosine similarity).
- ✅ Generate answers grounded in the retrieved sources (GPT-5.6 Luna).
- ✅ Show inline citations back to the source page/section.
- ✅ Log every question/answer run (`QueryRun`) for retrieval-quality tracing.
- ✅ Web UI: Material 3 theme (light/dark), upload flow, and a chat-style ask flow — wired end-to-end to the API.
- ⏳ Evaluation dashboard for retrieval/groundedness metrics.
- ⏳ Bring-your-own-key (BYOK): the server currently uses a single shared `OPENAI_API_KEY` for every request; per-request user-supplied keys are planned before any public deployment.

## Supported document formats

The ingestion pipeline currently supports:

- **Markdown (`.md`)** — YAML frontmatter is parsed into document metadata; the body becomes the document content.
- **Plain text (`.txt`)** — the raw file content becomes the document content, with no metadata extracted.
- **PDF (`.pdf`)** — text is extracted per page; page count and per-page text are captured for later page-aware chunking.

Any other extension (including `.docx`) is rejected at load time. We're intentionally scoping the pipeline to these three formats for now — adding a new format is a deliberate decision, not a drop-in.

## Duplicate detection

Every document is hashed (sha256) at normalization time and stored as `checksum`. On upload:

- **Same filename, unchanged content** — re-chunking and re-embedding are skipped entirely.
- **Same filename, changed content** — treated as an update: the document is re-chunked and re-embedded.
- **Different filename, identical content to an existing document** — resolved to the existing document instead of creating a second copy: no re-chunking or re-embedding happens, and the response is flagged (`duplicate: true`) with that document's own `id`/`title`/`sourceUri`. This is what lets a user recover a lost chat by re-uploading the same content under a different name (e.g. a re-download) instead of hitting a dead end — the Home panel shows "This file's content matches an existing document: `<title>`" and lets them continue into that chat rather than silently switching underneath them.

⚠️ **Known limitation**: for PDFs, `checksum` is computed on the *raw file bytes*, not the extracted text. A PDF that's been re-saved or re-exported (different producer metadata, same visible content) will hash differently and won't be caught as a duplicate. Markdown/plain text don't have this issue since their checksum is already based on file content, not extracted text.

## Chunking strategy

Documents are split into retrieval-sized chunks using a **recursive + structure-aware** approach for all three supported formats. The recursive splitting itself is handled by `@langchain/textsplitters`'s `RecursiveCharacterTextSplitter` (chunk size 1000 characters, 200 character overlap); on top of that, each format is split along its own natural structure first, so chunks carry positional metadata for citations:

- **PDF** — split per page (using the page-wise text captured during normalization); each chunk is tagged with `{ page: n }`.
- **Markdown** — split on headings (`#` through `######`) first; each chunk is tagged with `{ heading }`. Any section still too large after that is recursively split further using markdown-aware separators (lists, code fences, etc.).
- **Plain text** — no structure to split on, so it goes straight through the recursive splitter with no extra metadata.

`chunkIndex` is assigned sequentially across the whole document (not reset per page or section), so chunk order is always recoverable regardless of source format.

## Retrieval and generation

- **Retrieval** — the question is embedded with the same `text-embedding-3-small` model used for chunks, then the top-K chunks are selected by pgvector cosine distance (`embedding <=> query_vector`), optionally scoped to a single document.
- **Generation** — the retrieved chunks are passed as numbered context to **GPT-5.6 Luna** (`gpt-5.6-luna`), which is instructed to answer only from that context and cite sources by their `[n]` label.
- **Observability** — every question/answer run is logged to a `QueryRun` table (question, embedding model, similarity metric, topK, a snapshot of the retrieved chunks, the generation model, and the answer), so retrieval quality can be traced across runs even after chunks are later re-embedded or re-chunked.

## Web UI

A Material 3 (`@material/web`) interface lives at `app/page.tsx`, split into:

- `app/components/HomePanel.tsx` — upload a document (`.md`/`.txt`/`.pdf`, 4MB max). On success it hands off to the Ask tab.
- `app/components/AskPanel.tsx` — a chat-style thread: your question on the right, the grounded answer on the left with citations shown as `Answer [Page 1, Page 2]`.
- A light/dark theme toggle (persisted, no flash-of-wrong-theme on load) and a "Read Another Doc!" reset action.

The UI talks to two API routes, both backed by the pipeline above:

| Route | Method | Body | Returns |
| --- | --- | --- | --- |
| `/api/documents` | `POST` | `multipart/form-data` — `file` | `{ id, title, sourceUri, sourceType }` |
| `/api/ask` | `POST` | JSON — `{ question, documentId }` | `{ answer, citations }` |

Both routes read `OPENAI_API_KEY` from the server environment (not from the client — see "Bring-your-own-key" above), and both support an optional shared access-password gate via `APP_ACCESS_PASSWORD` (see [Environment variables](#environment-variables)).

## Current milestone

The full pipeline is wired end-to-end and usable from the browser: upload a document on the Home tab, then ask grounded questions about it on the Ask tab. Still ahead: BYOK, the evaluation dashboard, and hardening (rate limiting, real auth) before any public deployment.

## Tech stack

- Next.js (App Router) + TypeScript
- Prisma 7 + PostgreSQL + pgvector
- Docker Compose (local Postgres)
- LangChain (`@langchain/openai`, `@langchain/textsplitters`) for embeddings, chat, and chunking
- Material Design 3 (`@material/web`) + Tailwind CSS v4 for the UI
- Vitest for unit tests

## Environment variables

Do not commit `.env` — commit a `.env.example` (no real values) instead.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string, e.g. `postgresql://user:password@localhost:5432/readthedocs_ai` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Yes (for `docker compose`) | Used by `docker-compose.yml` to initialize the local Postgres container. Should match the credentials in `DATABASE_URL`. |
| `OPENAI_API_KEY` | Yes | Used server-side for embeddings (ingestion) and generation (asking). Read by both API routes and all CLI scripts. |
| `APP_ACCESS_PASSWORD` | No | If set, `/api/documents` and `/api/ask` require a matching `x-app-password` header (the UI has a password field for this). If unset, both routes are open — fine for local dev, not for a public deployment. |

```env
DATABASE_URL="postgresql://user:password@localhost:5432/readthedocs_ai"
POSTGRES_USER="user"
POSTGRES_PASSWORD="password"
POSTGRES_DB="readthedocs_ai"
OPENAI_API_KEY="..."
# APP_ACCESS_PASSWORD="optional-shared-password"
```

## Getting Started

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd <your-repo-folder>
```

### 2. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically (via `postinstall`).

### 3. Create your environment file

Create a `.env` file in the project root — see [Environment variables](#environment-variables) above for the full list.

### 4. Start PostgreSQL

Make sure Docker is running, then start the database:

```bash
docker compose up -d
```

### 5. Run Prisma migration

If migration files already exist:

```bash
npx prisma migrate dev
```

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a document (`.md`/`.txt`/`.pdf`, up to 4MB), then switch to the Ask tab and ask a question.

### Alternative: CLI scripts

Every pipeline stage also has a standalone, interactive CLI script for manual verification, useful if you want to test the pipeline without the browser:

```bash
npm run ingest:one   # ingest + chunk + embed a single file
npm run embed:one    # backfill embeddings for an existing document
npm run query        # retrieve top-K chunks for a question (no generation)
npm run ask          # full retrieve + generate, prints the grounded answer
```

All of the above read `OPENAI_API_KEY` from `.env`.

## Docker and database notes

This project uses a pgvector-enabled PostgreSQL image.

If you need to reset the local database:

```bash
docker compose down -v
docker compose up -d
npx prisma migrate dev
```

## Troubleshooting

### Database connection fails
Check:

- Docker is running.
- `DATABASE_URL` is correct.
- The Postgres container is up.

### Migration fails
Check:

- The container image includes pgvector.
- The migration SQL contains `CREATE EXTENSION IF NOT EXISTS vector;`
- The DB volume was recreated after image changes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Prisma's client outputs to a custom path (`app/generated/prisma`), which is gitignored — `postinstall` runs `prisma generate` automatically so the build has it. Set all the [environment variables](#environment-variables) above in the Vercel project settings before deploying (`OPENAI_API_KEY` in particular — without it, `/api/documents` and `/api/ask` return a 500).

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
