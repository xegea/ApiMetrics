Cursor AI Scaffolding Prompts:


Step 1 — Shared Types Package
Task: Scaffold a shared TypeScript package for multi-repo ApiMetrics project.

Details:
- Name: "@apimetrics/shared"
- Location: packages/shared
- Files/folders:
  - src/types.ts
  - src/utils.ts
  - package.json
  - tsconfig.json
  - README.md
- types.ts: define types
  - TestConfig { target: string, rps: number, duration: string, project: string }
  - TestResult { id: string, avgLatency: number, p95Latency: number, successRate: number, timestamp: string }
- utils.ts: helper functions for formatting timestamps and percentages
- TypeScript strict mode
- Include MIT license
- Do NOT generate CLI, API, or Web code
- Keep minimal and modular


Step 2 — CLI Repo
Task: Scaffold NPX CLI for ApiMetrics project.

Details:
- Name: "apimetrics-cli"
- Location: apps/cli
- Language: TypeScript
- Entry: src/index.ts
- Functionality:
  1. Read test.json from local filesystem
  2. Execute load test using wrapper over Vegeta (simulate if binary missing)
  3. Compress results JSON and POST to configurable API endpoint (APIMETRICS_API_URL)
  4. Accept --token flag for authentication
  5. Display progress and summary in terminal
- Dependencies: axios, chalk, commander, zod
- Import shared types from "@apimetrics/shared"
- Include package.json, tsconfig.json, README.md, MIT license
- Only scaffold CLI and basic upload logic; do not generate full API integration yet


Step 3 — API Repo
Task: Scaffold Fastify backend for ApiMetrics project.

Details:
- Name: "apimetrics-api"
- Location: apps/api
- Language: Node.js + TypeScript
- Functionality:
  1. POST /results → accept uploaded JSON from CLI
  2. GET /results/:id → return metrics for Test Executions
  3. POST /auth/login → JWT-based auth
- Use Prisma to connect to PostgreSQL (Supabase)
- Import types from "@apimetrics/shared"
- Folder structure:
  - src/index.ts
  - src/routes/results.ts
  - src/routes/auth.ts
  - src/services/db.ts
  - prisma/schema.prisma
- Include package.json, tsconfig.json, README.md, MIT license
- Minimal: scaffold endpoints only, no Docker yet, no AI summaries


Step 4 — Web Repo
Task: Scaffold Next.js frontend for ApiMetrics project.

Details:
- Name: "apimetrics-web"
- Location: apps/web
- Language: TypeScript
- Next.js 15 (App Router)
- Pages:
  - /login → user login
  - /loadtestsexecutions → list of tests + basic metrics
  - /test/[id] → charts (avg latency, p95, success rate) using Recharts
- Fetch data from APIMETRICS_API_URL (env variable)
- Tailwind CSS for styling
- TanStack Query (React Query) for data fetching
- Import types from "@apimetrics/shared"
- Include package.json, tsconfig.json, README.md, MIT license
- Minimal scaffold: pages, basic fetch, sample charts only, no AI summaries yet


Step 5 — Deployment Setup (GitHub → Cloud)
Task: Provide instructions for deploying ApiMetrics MVP automatically from GitHub.

Details:
- Backend API: Render
  - Connect GitHub repo (apps/api)
  - Environment variables: DATABASE_URL, OPENAI_API_KEY, JWT_SECRET
  - Free plan for MVP
- Frontend Web: Vercel
  - Connect GitHub repo (apps/web)
  - Environment variable: NEXT_PUBLIC_API_URL (points to Render API)
- Database: Supabase
  - Free PostgreSQL instance
  - Optional Auth if needed
- CLI: npm publish for NPX
- AI Summaries: OpenAI (optional)
- Goal: Any commit to GitHub → automatic deployment
