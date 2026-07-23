# ReadTheDocs AI

ReadTheDocs AI is a grounded document Q&A app built with Next.js, Prisma, PostgreSQL, and pgvector.

It lets you ask questions in natural language and returns answers backed by real document sources, with inline citations, a “Why this answer?” trace, and evaluation metrics to measure retrieval quality and groundedness.

## What this project does

This app is being built in stages:

- Load and ingest documents.
- Split documents into chunks.
- Create embeddings for each chunk.
- Store chunks and embeddings in PostgreSQL with pgvector.
- Retrieve relevant chunks for a user question.
- Generate answers grounded in the retrieved sources.
- Show inline citations and source details.
- Track runs and evaluation metrics for quality and regression testing.

## Current milestone

The repo is currently set up through:

- Next.js project initialization.
- PostgreSQL container setup.
- Prisma schema creation.
- Prisma migration applied.
- pgvector extension enabled.

At this stage, the foundation is ready for the ingestion pipeline.

## Tech stack

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- pgvector
- Docker Compose

## Getting Started

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd <your-repo-folder>
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Create your environment file

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DB"
```

If you later add API keys for embeddings or LLMs, place them here too.

### 4. Start PostgreSQL

Make sure Docker is running, then start the database:

```bash
docker compose up -d
```

### 5. Run Prisma migration

If migration files already exist:

```bash
pnpm prisma migrate dev
```

Then generate the Prisma client if needed:

```bash
pnpm prisma generate
```

### 6. Start the app

```bash
pnpm dev
```

## Docker and database notes

This project uses a pgvector-enabled PostgreSQL image.

If you need to reset the local database:

```bash
docker compose down -v
docker compose up -d
pnpm prisma migrate dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

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

## Security

Do not commit `.env`.

Commit `.env.example` instead.

## Example `.env.example`

```env
DATABASE_URL="postgresql://user:password@localhost:5432/readthedocs_ai"
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
