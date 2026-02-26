# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eternal Sentinel is a secure digital dead man's switch / digital legacy service. Users store encrypted vault items (passwords, documents, messages) that are released to designated trustees if they become unreachable through the check-in system. Live at https://www.onceimgone.com/.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run worker:dev       # Start background worker (watch mode)
docker-compose up -d postgres redis   # Start local database services

# Database
npm run db:generate      # Generate Prisma client (required before build)
npm run db:push          # Push schema changes to database
npm run db:migrate       # Run Prisma migrations
npm run db:studio        # Launch Prisma Studio (port 5555)
npm run db:seed          # Seed database
npm run db:create-admin  # Create admin user

# Testing (vitest)
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once (CI)
npx vitest run tests/crypto.test.ts   # Run a single test file

# Build
npm run build            # Production build (run db:generate first)
npm run lint             # ESLint (Next.js built-in config)

# Deploy (requires AWS CLI, Docker, Terraform)
AWS_DEFAULT_REGION=us-east-2 bash scripts/deploy.sh          # Full deploy
AWS_DEFAULT_REGION=us-east-2 bash scripts/deploy.sh --skip-build   # Skip Docker build
AWS_DEFAULT_REGION=us-east-2 bash scripts/deploy.sh --migrate-only # Run migrations only
```

## Architecture

### Zero-Knowledge Encryption

Client-side encryption — the server never sees plaintext vault data:

1. User creates a vault password (separate from login) → PBKDF2 (100k iterations) derives encryption key
2. Random AES-256 master key is encrypted with derived key
3. Each vault item is encrypted with master key using AES-256-GCM with unique per-item nonces
4. Server stores only ciphertext; password change re-encrypts master key without re-encrypting items

**Key files**: `src/lib/crypto/client.ts` (browser encryption via Web Crypto API), `src/lib/crypto/server.ts` (token generation, HMAC, server-side AES for non-vault data)

### Check-in & Escalation State Machine

The dead man's switch is a state machine on `PollingConfig.status`:

```
ACTIVE → (missed check-in) → GRACE_1 → GRACE_2 → GRACE_3 → TRIGGERED
  ↑                              ↓          ↓          ↓
  └──────── user confirms ───────┘──────────┘──────────┘
```

1. **Scheduler** (`workers/scheduler.ts`) runs every 60s: finds due check-ins, marks expired ones as MISSED, schedules escalation jobs
2. **Check-in Worker** sends email/SMS reminders with unique token links
3. **Escalation Worker** processes levels 1-3: creates grace period check-ins (7d, 14d, 7d), sends warnings
4. **Death Protocol Worker** (concurrency=1): generates 48-byte access tokens for each verified trustee, grants 30-day vault access window

**Key files**: `workers/index.ts` (all job processors), `workers/scheduler.ts` (polling loop), `src/lib/queue/index.ts` (queue definitions and job scheduling functions)

### Route Groups

- `(auth)/` — Public login/signup/verify-email pages (no layout auth check)
- `(dashboard)/` — Protected routes; `layout.tsx` calls `auth()` and redirects unauthenticated users
- `api/` — Backend endpoints; auth checked per-route via `auth()` helper
- Root-level pages (`/`, `/about`, `/checkin`, `/trustee/*`) — Public, no auth required

### Background Worker Process

The worker runs as a **separate Docker container** (`Dockerfile.worker`) alongside the Next.js app. It connects to the same PostgreSQL and Redis instances. Both `workers/index.ts` and `workers/scheduler.ts` run in the same process.

BullMQ queues: `check-in`, `escalation`, `death-protocol`, `email`, `sms`

### Infrastructure

AWS deployment managed by Terraform in `infra/`:
- **ECS Fargate**: App service (Next.js, port 3000) + Worker service (BullMQ)
- **RDS PostgreSQL 16.6** and **ElastiCache Redis 7.1** in private subnets
- **ALB** with HTTPS termination in public subnets
- **ECR** repositories for app and worker Docker images
- **Secrets Manager** for environment variables injected into ECS tasks

Deploy script (`scripts/deploy.sh`): builds Docker images → pushes to ECR → runs migration as one-off ECS task → rolling-updates app and worker services.

**Important**: AWS resources are in `us-east-2`. The AWS CLI default region may differ, so always pass `AWS_DEFAULT_REGION=us-east-2` when running deploy or AWS commands.

## Key Patterns

- **API responses**: All endpoints return `{ success: boolean, data?: T, error?: string }`
- **Validation**: Zod schemas for all API inputs
- **Encryption boundary**: Client encrypts vault data before API calls; server handles tokens/auth only
- **Components**: shadcn/ui (Radix primitives) in `src/components/ui/`; uses `cn()` utility with tailwind-merge
- **User-facing errors**: Use inline `error` state rendered as a visible `<div>` — do NOT use `useToast` for auth/form errors (toasts disappear on navigation and are unreliable on auth pages)
- **Path aliases**: `@/*` → `./src/*`
- **Dark theme**: `className="dark"` on root `<html>` element; shadcn CSS variables defined in `globals.css` under `.dark` selector
- **Prisma singleton**: `src/lib/db/index.ts` — reuses client across hot reloads in dev
- **Auth helper**: `import { auth } from "@/lib/auth"` returns session; use `session?.user?.id` for the current user

## Subscription Tiers

- **Free**: 1 trustee, monthly check-in only, email notifications
- **Premium** ($9/mo): Unlimited trustees, weekly/bi-weekly/monthly intervals, SMS notifications

Feature gates enforced in API routes (`/api/polling`, `/api/trustees`). Stripe webhooks in `/api/stripe/webhook` handle plan changes.

## External Services

- **Auth**: NextAuth.js v5 with PrismaAdapter (email/password + Google OAuth)
- **Email**: Resend API (primary) or Nodemailer SMTP (fallback) — `src/lib/email/index.ts`
- **SMS**: Twilio — `src/lib/sms/index.ts`
- **Payments**: Stripe — `src/lib/stripe/index.ts`
- **Database**: PostgreSQL via Prisma — schema at `prisma/schema.prisma`
- **Queue**: Redis via BullMQ/IORedis — `src/lib/queue/index.ts`

## Tests

Test files live in `tests/` (not `src/`):
- `tests/crypto.test.ts` — Server-side crypto utilities (token generation, encryption, HMAC)
- `tests/trigger.test.ts` — Death protocol escalation state machine logic
