# Eternal Sentinel

A secure digital dead man's switch / digital legacy service. Store encrypted passwords, documents, and messages that are released to designated trustees if you become unreachable.

## Features

- **Encrypted Vault**: Store passwords, documents, and messages with client-side AES-256-GCM encryption
- **Zero-Knowledge Architecture**: Server never sees your plaintext data
- **Automated Check-ins**: Configurable polling intervals (weekly, bi-weekly, monthly)
- **Escalating Grace Periods**: Multiple chances before triggering the death protocol
- **Trusted Contacts**: Designate people who receive vault access when needed
- **Multi-channel Notifications**: Email and SMS reminders
- **Subscription Plans**: Free tier and Premium with unlimited trustees

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (Email/Password + Google OAuth)
- **Encryption**: Web Crypto API (AES-256-GCM, PBKDF2)
- **Background Jobs**: BullMQ + Redis
- **Email**: Resend (or Nodemailer)
- **SMS**: Twilio
- **Payments**: Stripe

## How Encryption Works

### Zero-Knowledge Design

1. **Vault Password**: Users create a separate vault password (not their login password)
2. **Key Derivation**: PBKDF2 with 100,000 iterations derives an encryption key from the password
3. **Master Key**: A random AES-256 master key is generated and encrypted with the derived key
4. **Item Encryption**: Each vault item is encrypted with the master key using AES-256-GCM
5. **Server Storage**: Only encrypted ciphertext and metadata are stored on the server

### Key Points

- The server **never** sees plaintext vault data or the user's vault password
- Each item has its own random nonce for encryption
- The master key is re-encrypted if the vault password changes
- Trustees need the vault password to decrypt - share it separately

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd eternal-sentinel

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure environment variables (see below)

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Start development server
npm run dev

# In another terminal, start the worker
npm run worker:dev
```

### Environment Variables

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/eternal_sentinel"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth.js
AUTH_SECRET="openssl rand -base64 32"
AUTH_URL="http://localhost:3000"

# Google OAuth (optional)
AUTH_GOOGLE_ID="your-client-id"
AUTH_GOOGLE_SECRET="your-client-secret"

# Email (Resend)
RESEND_API_KEY="re_xxx"
EMAIL_FROM="noreply@yourdomain.com"

# SMS (Twilio)
TWILIO_ACCOUNT_SID="xxx"
TWILIO_AUTH_TOKEN="xxx"
TWILIO_PHONE_NUMBER="+1234567890"

# Stripe
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
STRIPE_PRICE_ID_MONTHLY="price_xxx"
STRIPE_PRICE_ID_YEARLY="price_xxx"

# Server Encryption (for tokens)
ENCRYPTION_KEY="openssl rand -hex 32"
```

### Running with Docker

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Or start everything
docker-compose up
```

## Project Structure

```
eternal-sentinel/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Login/signup pages
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── api/               # API routes
│   │   ├── checkin/           # Check-in confirmation page
│   │   └── trustee/           # Trustee access portal
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   └── ...               # Feature components
│   ├── lib/
│   │   ├── auth/             # NextAuth configuration
│   │   ├── crypto/           # Encryption utilities
│   │   ├── db/               # Prisma client
│   │   ├── email/            # Email service
│   │   ├── queue/            # BullMQ configuration
│   │   ├── sms/              # SMS service
│   │   └── stripe/           # Stripe integration
│   └── types/                # TypeScript types
├── prisma/
│   └── schema.prisma         # Database schema
├── workers/                   # Background job processors
└── tests/                     # Test files
```

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints

### Vault
- `GET /api/vault` - Get vault with items
- `POST /api/vault` - Create vault
- `PUT /api/vault` - Update vault (change password)
- `GET /api/vault/items` - Get vault items
- `POST /api/vault/items` - Add vault item
- `PUT /api/vault/items/[id]` - Update item
- `DELETE /api/vault/items/[id]` - Delete item

### Trustees
- `GET /api/trustees` - List trustees
- `POST /api/trustees` - Add trustee
- `PUT /api/trustees/[id]` - Update trustee
- `DELETE /api/trustees/[id]` - Remove trustee

### Polling
- `GET /api/polling` - Get polling config
- `PUT /api/polling` - Update polling config
- `POST /api/polling` - Pause/resume polling

### Check-in
- `GET /api/checkin` - Get check-in history
- `POST /api/checkin` - Manual check-in
- `GET /api/checkin/confirm` - Verify check-in token
- `POST /api/checkin/confirm` - Confirm check-in

### Stripe
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Create billing portal session
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### Trustee Access
- `GET /api/trustee/access` - Verify access token
- `POST /api/trustee/access` - Get vault data

## Escalation Logic

1. **Check-in sent** via configured interval (weekly/bi-weekly/monthly)
2. **First miss** → Enter Grace Period 1 (default 7 days)
3. **Second miss** → Enter Grace Period 2 (default 14 days)
4. **Third miss** → Enter Grace Period 3 (default 7 days)
5. **Grace Period 3 expires** → **Death Protocol Triggered**
   - All verified trustees notified
   - Time-limited vault access granted (30 days)

At any point, confirming a check-in resets the counter to zero.

## Deployment

### Vercel + Railway/Neon

1. **Database**: Use Railway or Neon for PostgreSQL
2. **Redis**: Use Upstash Redis
3. **App**: Deploy to Vercel
4. **Worker**: Deploy to Railway as a separate service

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run db:generate && npm run build",
  "framework": "nextjs"
}
```

### Railway Worker

```dockerfile
# Dockerfile.worker
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npx prisma generate
CMD ["npm", "run", "worker"]
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests once
npm run test:run
```

## Security Considerations

1. **Client-side encryption**: All vault data is encrypted before leaving the browser
2. **PBKDF2 key derivation**: 100,000 iterations for brute-force resistance
3. **AES-256-GCM**: Authenticated encryption prevents tampering
4. **Unique nonces**: Each encryption operation uses a unique random nonce
5. **Rate limiting**: Implement rate limiting on authentication endpoints
6. **HTTPS**: Always use HTTPS in production
7. **Trustee password sharing**: Users must share vault passwords out-of-band

## Free vs Premium

| Feature | Free | Premium |
|---------|------|---------|
| Trustees | 1 | Unlimited |
| Check-in Interval | Monthly | Weekly/Bi-weekly/Monthly |
| Email Notifications | Yes | Yes |
| SMS Notifications | No | Yes |
| Vault Items | Unlimited | Unlimited |

## License

MIT
# sentinel
