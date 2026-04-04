# Phase 1: Foundation — Fork & Auth Setup

## Goal

Get a running Fountain.ink fork configured for your Lens App with working
auth. By the end, you can log in and publish a test article that appears
on Lens under your app identity.

## Prerequisites

- Bun v1.2.5+
- Supabase project (new or existing)
- WalletConnect project ID
- Wallet that owns the Lens App (Builder wallet)
- Lens App addresses:
  - Mainnet: `0x637E685eF29403831dE51A58Bc8230b88549745E`
  - Testnet: `0x9eD1562A4e3803964F3c84301b18d4E1944D340b`

---

## Steps

### 1.1 Fork & Clone

```
fountain-ink/app  → your-org/society-forum
fountain-ink/auth → your-org/society-forum-auth
```

```bash
git clone https://github.com/<your-org>/society-forum.git
cd society-forum && bun install

git clone https://github.com/<your-org>/society-forum-auth.git
cd society-forum-auth && bun install
```

### 1.2 Generate Auth Keys

```bash
cd society-forum-auth
bun src/keygen.ts
```

Produces 3 values — save securely:
- `SIGNER_PRIVATE_KEY` — signs operations (NOT the Builder wallet)
- `SIGNER_ADDRESS` — registered with Lens as App Signer
- `AUTH_API_SECRET` — shared secret between Lens API and your auth server

### 1.3 Configure Auth Server

Create `.env` in auth repo:
```env
PRIVATE_KEY=<SIGNER_PRIVATE_KEY>
ENVIRONMENT=production
API_SECRET=<AUTH_API_SECRET>
APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
APP_ADDRESS_TESTNET=0x9eD1562A4e3803964F3c84301b18d4E1944D340b
PORT=3004
```

Test: `bun run dev` → `curl -X POST http://localhost:3004/authorize ...`

### 1.4 Deploy Auth Server

Deploy to Railway/Fly.io/Vercel. Must respond < 500ms.
Save the public URL (e.g., `https://auth.yourdomain.com`).

### 1.5 Register with Lens (One-Time)

Run the Builder registration script (see MasterPlanV2 Part 1, Step 4):
1. Authenticate as Builder (wallet that owns the Lens App)
2. `addAppAuthorizationEndpoint(sessionClient, { endpoint, app, bearerToken })`
3. `addAppSigners(sessionClient, { app, signers: [SIGNER_ADDRESS] })`

### 1.6 Configure Fountain Fork

Create `.env` in app repo with:
- Supabase credentials (URL, anon key, service key, JWT secret)
- WalletConnect project ID
- Your Lens App addresses
- Lens API keys
- Auth server URL
- Placeholder values for Listmonk and Iframely (required by env schema)

### 1.7 Run Fountain Migrations

```bash
cd supabase && supabase db push
```

### 1.8 Inspect Middleware

Open `src/middleware.ts`. Add your forum domain to `allowedOrigins`.
No auth-gating changes needed — auth is handled at component/API level.

### 1.9 Light Branding Cleanup

- Update app name in metadata
- Update favicon/logo
- Leave all Fountain features intact (editor, blogs, settings)

---

## Acceptance Tests

| # | Test | Expected Result | Status |
|---|---|---|---|
| T1.1 | `bun run dev` starts without errors | App loads at localhost:3000 | ✅ |
| T1.2 | Connect wallet + select Lens account | Login succeeds, auth server logs show request | ✅ |
| T1.3 | Create test article in Plate.js editor | Editor works, content saves to draft | ✅ |
| T1.4 | Publish test article | Post appears on Lens (verify on Hey.xyz) | ✅ |
| T1.5 | Check post `app` field on Hey.xyz | Shows YOUR app name, not "Fountain" | ✅ |
| T1.6 | Auth server responds to health check | < 500ms response time | ✅ |
| T1.7 | `curl` auth endpoint with wrong secret | Returns 401 | ✅ |

## Completion Notes (2026-04-04)

### Infrastructure Deployed
- **VPS:** Hostinger Ubuntu 24.04, 2 CPU, 8GB RAM, 90GB disk (72.61.119.100)
- **Supabase:** Self-hosted via Docker on VPS (port 8000 API, port 5432 PostgreSQL)
- **Auth Server:** PM2 on VPS, HTTPS via `auth.societyprotocol.io`
- **Forum domain:** `forum.societyprotocol.io` (existing, points to VPS)

### Keys Generated
- Signer Address: `0x574BAadd11b948231883E85d237D299A991371c8`
- Auth endpoint registered with Lens ✅
- App signer registered with Lens ✅

### Known Issues (Non-blocking)
- Cookie clear error on logout (`clear-cookies.ts` line 7 — non-ASCII cookie name)
- Share URLs point to `fountain.ink` — needs `NEXT_PUBLIC_SITE_URL` set to your domain
- `IFRAMELY_API_KEY` required by env schema — using placeholder value

### Implementation Log

**Problem 1: `.env.example` was missing `IFRAMELY_API_KEY`**
The env validation schema (`src/env.js`) requires `IFRAMELY_API_KEY` but
`.env.example` only listed `IFRAMELY_BASE_URL`. Fixed by adding
`IFRAMELY_API_KEY=placeholder` to `.env`.

**Problem 2: ChunkLoadError on first run**
Stale `.next` cache from before `.env` was configured. Fixed with `rm -rf .next`.

**Problem 3: Wrong network — "Create profile" instead of "Select profile"**
`NEXT_PUBLIC_ENVIRONMENT` was set to `development` (testnet) instead of
`production` (mainnet). Existing Lens accounts are on mainnet. Fixed by
changing to `production`.

**Problem 4: "Profile not found" / login failure**
Self-hosted Supabase had no tables — Fountain migrations hadn't been run.
The `signAppToken` function queries the `users` table which didn't exist.
Fixed by running migrations from VPS:
```bash
docker exec -i supabase-db psql -U postgres -d postgres < migration.sql
```

**Problem 5: Supabase CLI couldn't connect from Mac**
`npx supabase db push` failed with TLS error — Docker PostgreSQL doesn't
have SSL. `sslmode=disable` didn't help either. Solved by running
migrations directly on the VPS via `docker exec`.

**Problem 6: ByteString error in notifications**
`Cannot convert argument to a ByteString` — likely caused by non-ASCII
characters in the `LENS_API_KEY`. Resolved after getting the correct
API key from the Lens Developer Dashboard.

## Files Created/Modified

```
society-forum-auth/.env              — auth server config
society-forum/.env                   — app config
scripts/register-auth-endpoint.ts    — one-time Lens registration
src/middleware.ts                     — add forum domain (minor edit)
```

## Risk Notes

- Auth endpoint MUST respond < 500ms or Lens rejects logins
- SIGNER_PRIVATE_KEY ≠ Builder PRIVATE_KEY — never reuse keys
- Listmonk/Iframely env vars are required by Fountain's env schema
  but can use placeholder values initially
