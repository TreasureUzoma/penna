# Contributing to Penna

Thanks for your interest in contributing! This document covers everything you need to get the monorepo running locally, understand the project layout, and open a pull request that will be reviewed quickly.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Coding Guidelines](#coding-guidelines)
- [Commit & Branch Conventions](#commit--branch-conventions)
- [Opening a Pull Request](#opening-a-pull-request)
- [Reporting Bugs](#reporting-bugs)

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| **Node.js** | 20 | Required by all apps |
| **pnpm** | 10.4.1 | Declared in `packageManager` field |
| **Bun** | latest stable | Used to run `apps/server` |
| **PostgreSQL** | 14+ | [Neon](https://neon.tech) works great for dev |
| **Redis** | 6+ | [Upstash](https://upstash.com) free tier works for dev |

---

## Getting Started

```bash
# 1. Fork and clone
git clone https://github.com/<your-fork>/penna.git
cd penna

# 2. Install dependencies (all workspaces at once)
pnpm install

# 3. Copy the example env file and fill in your values
cp .env.example .env

# 4. Push the database schema
cd packages/db
pnpm drizzle-kit push
cd ../..

# 5. Start all apps in parallel
pnpm dev
```

> [!TIP]
> Use `pnpm dev-local` if you want colour-coded output per app (requires `concurrently`). Individual apps can also be started in isolation — see each app's own `package.json` for its `dev` script.

---

## Project Structure

```
penna/
├── apps/
│   ├── dashboard/     # Next.js — authenticated user dashboard
│   ├── docs/          # Documentation site
│   ├── server/        # Hono API server (runs on Bun)
│   └── web/           # Next.js — public newsletter pages
├── packages/
│   ├── axios/         # Shared Axios instance
│   ├── constants/     # Shared constants (plans, limits, etc.)
│   ├── db/            # Drizzle ORM schema + migrations
│   ├── eslint-config/ # Shared ESLint config
│   ├── types/         # Shared TypeScript types
│   ├── typescript-config/ # Shared tsconfig bases
│   ├── ui/            # Shared component library (shadcn/ui)
│   └── validations/   # Shared Zod schemas
├── CODING_GUIDELINES.md
├── turbo.json
└── .env.example
```

### Key conventions

- **`apps/server`** — Hono routes live in `routes/api/v1/`. Logic lives in `services/`. Routes are thin: they validate input, call a service, and return the result. Business logic belongs in services.
- **`apps/dashboard`** and **`apps/web`** — Next.js App Router. Data fetching in Server Components uses `fetch` directly; client-side data fetching uses **TanStack Query** (never bare `useEffect`).
- **Shared code** goes in `packages/`, not copy-pasted between apps.

---

## Environment Variables

Copy `.env.example` to `.env` at the repo root and fill in the values. The table below explains the groups:

| Group | Variables | Where to get them |
|---|---|---|
| **Database** | `DB_URL` | [Neon](https://neon.tech) or any Postgres |
| **Redis** | `REDIS_URL` | [Upstash](https://upstash.com) |
| **Auth secrets** | `ENCRYPTION_KEY`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `UNSUBSCRIBE_SECRET` | Generate at [auth-secret-gen.vercel.app](https://auth-secret-gen.vercel.app/) or with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **OAuth** | `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` | Google Cloud Console / GitHub Developer Settings |
| **AWS SES** | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEWSLETTER_DOMAIN`, `SYSTEM_EMAIL_FROM`, `SES_NOTIFICATIONS_TOPIC_ARN` | AWS Console |
| **Paddle** | `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_ID_*`, `NEXT_PUBLIC_PADDLE_*` | [Paddle Dashboard](https://paddle.com) |
| **Cloudflare R2** | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | [Cloudflare Dashboard](https://dash.cloudflare.com) |
| **Groq (moderation)** | `GROQ_API_KEY` | [Groq Console](https://console.groq.com) — optional; moderation is skipped if unset |
| **Turnstile** | `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) |
| **URLs** | `APP_URL`, `API_URL`, `WEB_URL`, `DASHBOARD_SITE`, `DOCS_SITE` | Use the localhost defaults from `.env.example` for development |

> [!IMPORTANT]
> `ENCRYPTION_KEY` must be a **64-character hex string** (32 bytes). API keys and email bodies in the database are encrypted with AES-GCM — a wrong key length will cause startup errors.

---

## Development Workflow

### Running individual apps

```bash
# API server (Bun + Hono) — port 3005
cd apps/server && bun run dev

# Dashboard (Next.js) — port 3001
cd apps/dashboard && pnpm dev

# Public web (Next.js) — port 3000
cd apps/web && pnpm dev

# Docs — port 3006
cd apps/docs && pnpm dev
```

### Database

```bash
# Push schema changes (no migration files, good for dev)
cd packages/db && pnpm drizzle-kit push

# Generate SQL migration files (for production-tracked changes)
cd packages/db && pnpm drizzle-kit generate

# Open Drizzle Studio (visual DB browser)
cd packages/db && pnpm drizzle-kit studio
```

### Linting & formatting

```bash
# Lint all workspaces
pnpm lint

# Format all TS/TSX/MD files
pnpm format
```

---

## Coding Guidelines

These extend `CODING_GUIDELINES.md` in the repo root:

### Files & naming
- All filenames and directories use **`kebab-case`** (`newsletter-view.tsx`, not `NewsletterView.tsx`).
- React component exports use **`PascalCase`** (`export function NewsletterView`).

### Backend (`apps/server`)
- **Routes are thin** — validate with `zValidator`, call a service, return the result. No DB queries in route handlers.
- **Services return `ServiceResponse`** — `{ success, message, data }`. Never throw to the caller; catch internally and return `{ success: false }`.
- **One `triggerSendIfPublished` per service file** — don't duplicate it. The canonical copy lives in `services/emails.ts`.
- Rate-limit registrations live in `index.ts`, not inside the route files themselves.

### Frontend (`apps/dashboard`, `apps/web`)
- **TanStack Query for all client-side data fetching** — no `useEffect` fetches.
- **Server Components fetch directly** — via `fetch()` with `next: { revalidate }` or `cache: "no-store"` as appropriate.
- Keep pages thin — move any non-trivial UI into a `components/` file colocated with the route.

### Shared packages
- Zod schemas belong in `packages/validations`.
- Types shared between server and client go in `packages/types`.
- Never import directly across `apps/` — go through `packages/` if something is shared.

---

## Commit & Branch Conventions

### Branches

Branch from `main` using one of these prefixes:

| Prefix | Use for |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Tooling, deps, config |
| `docs/` | Documentation changes |
| `refactor/` | Code changes with no behaviour change |

Example: `feat/subscriber-segments-ui`, `fix/og-image-cache`

### Commit messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>

[optional body]
```

Examples:
```
feat(server): add rate limit to external send endpoint
fix(web): remove stale 60s cache on public posts list
chore(deps): bump drizzle-orm to 0.44.7
docs: add CONTRIBUTING.md
```

---

## Opening a Pull Request

1. **Create a focused branch** — one logical change per PR. Avoid bundling unrelated changes.
2. **Fill in the PR template** — describe what changed and why, not just what.
3. **Keep diffs small** — large PRs are hard to review. Break big features into stacked PRs if needed.
4. **Check your types and lint** — run `pnpm lint` before pushing. CI will reject PRs that don't pass.
5. **Add a brief test plan** — describe how you manually verified the change works (and doesn't break anything adjacent).

> [!NOTE]
> If you're fixing a bug, include a short description of how to reproduce it in the PR body. It helps reviewers confirm the fix works.

---

## Reporting Bugs

Open a [GitHub issue](https://github.com/TreasureUzoma/penna/issues) and include:

- What you expected to happen
- What actually happened
- Steps to reproduce (the shorter the better)
- Environment (OS, Node version, which app is affected)

For security issues, **do not open a public issue** — reach out directly via [X/Twitter](https://x.com/idolodev).
