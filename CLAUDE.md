# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eternal Sentinel is a secure digital dead man's switch / digital legacy service. Users store encrypted vault items (passwords, documents, messages) that are released to designated trustees if they become unreachable through the check-in system.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run worker:dev       # Start background worker (watch mode)

# Database
npm run db:generate      # Generate Prisma client (run before build)
npm run db:push          # Push schema changes to database
npm run db:migrate       # Run Prisma migrations
npm run db:studio        # Launch Prisma Studio (port 5555)
npm run db:seed          # Seed database

# Testing
npm test                 # Run tests in watch mode (vitest)
npm run test:run         # Run tests once (CI)

# Build & Deploy
npm run build            # Production build (requires db:generate first)
npm run lint             # Run ESLint

# Docker
docker-compose up -d postgres redis   # Start database services
```

## Architecture

### Zero-Knowledge Encryption

The application implements client-side encryption where the server never sees plaintext vault data:

1. User creates a vault password (separate from login) → PBKDF2 (100k iterations) derives encryption key
2. Random AES-256 master key is encrypted with derived key
3. Each vault item is encrypted with master key using AES-256-GCM with unique nonces
4. Only ciphertext stored server-side

**Key files**: `src/lib/crypto/client.ts` (browser encryption), `src/lib/crypto/server.ts` (token generation)

### Check-in & Escalation System

The "death protocol" workflow managed by BullMQ workers:

1. Check-in reminders sent at configured intervals (weekly/bi-weekly/monthly)
2. Missed check-in → Escalate through 3 grace periods (default: 7, 14, 7 days)
3. All grace periods missed → Death protocol triggers: trustees get 30-day vault access

**Key files**: `workers/index.ts` (job processors), `src/lib/queue/index.ts` (queue config)

### Route Groups

- `(auth)/` - Public login/signup pages
- `(dashboard)/` - Protected routes (layout checks auth, redirects if unauthenticated)
- `api/` - Backend endpoints with Zod validation

### Background Jobs

BullMQ queues via Redis: `check-in`, `escalation`, `death-protocol`, `email`, `sms`

Worker runs as separate process: `npm run worker` or `npm run worker:dev`

## Key Patterns

- **API responses**: All endpoints return `{ success: boolean, data?: T, error?: string }`
- **Validation**: Zod schemas for all API inputs
- **Encryption boundary**: Client encrypts vault data before API calls; server handles tokens/auth only
- **Components**: shadcn/ui (Radix primitives) in `src/components/ui/`
- **Path aliases**: `@/*` → `./src/*`

## Subscription Tiers

- **Free**: 1 trustee, monthly check-in only, email notifications
- **Premium**: Unlimited trustees, flexible check-in intervals, SMS notifications

Controlled via `Subscription` model with plan enum.

## External Services

- **Auth**: NextAuth.js v5 (email/password + Google OAuth)
- **Email**: Resend or Nodemailer
- **SMS**: Twilio
- **Payments**: Stripe
- **Database**: PostgreSQL via Prisma
- **Queue**: Redis via BullMQ/IORedis
