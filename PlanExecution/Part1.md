# Part 1: Foundation — Fork & Auth Setup

## Goal

Get a running fountain.ink fork configured for your existing Lens App
(0x637E...) with a working Authorization Endpoint and App Verification.
By the end of this part, you can log in to the forked app and every
operation is signed by your app's signer key.

---

## Prerequisites

- Bun v1.2.5+ installed (`curl -fsSL https://bun.sh/install | bash`)
- A Supabase project (you already have one)
- A WalletConnect project ID (you already have one from current app)
- Access to the wallet that owns the Lens App (the PRIVATE_KEY in .env.local)
- Your existing Lens App addresses:
  - Mainnet App: `0x637E685eF29403831dE51A58Bc8230b88549745E`
  - Testnet App: `0x9eD1562A4e3803964F3c84301b18d4E1944D340b`
  - Admin address: `0xc93947ed78d87bdeb232d9c29c07fd0e8cf0a43e`

---

## Step 1: Fork the Repositories

### 1.1 Fork fountain-ink/app

Go to https://github.com/fountain-ink/app and click "Fork".

Name it something like `society-protocol-forum` or keep `app`.

Clone locally:
```bash
git clone https://github.com/<your-org>/app.git society-forum
cd society-forum
bun install
```

### 1.2 Fork fountain-ink/auth

Go to https://github.com/fountain-ink/auth and click "Fork".

Clone locally:
```bash
git clone https://github.com/<your-org>/auth.git society-forum-auth
cd society-forum-auth
bun install
```

---

## Step 2: Generate Auth Keys

In the auth repo, run the keygen script:

```bash
cd society-forum-auth
bun src/keygen.ts
```

This outputs three values. Save them securely:

```
Approver Private Key:  0x72433488d76ffec7a16b...  ← SIGNER_PRIVATE_KEY
Approver Address:      0x8711d4d6B7536D...         ← SIGNER_ADDRESS
API Secret:            0xabc123...                  ← AUTH_API_SECRET
```

IMPORTANT: This is a NEW keypair, separate from your existing PRIVATE_KEY.
- Your existing PRIVATE_KEY = the wallet that OWNS the Lens App (Builder auth)
- The new SIGNER_PRIVATE_KEY = the key that SIGNS operations (App Verification)

They serve different purposes. Never reuse keys.

---

## Step 3: Configure the Auth Server

### 3.1 Create .env file

```bash
cd society-forum-auth
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=0x72433488d76ffec7a16b...       # SIGNER_PRIVATE_KEY from Step 2
ENVIRONMENT=production                       # or development for testnet
API_SECRET=0xabc123...                       # AUTH_API_SECRET from Step 2
APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E          # mainnet
APP_ADDRESS_TESTNET=0x9eD1562A4e3803964F3c84301b18d4E1944D340b  # testnet
PORT=3004
```

### 3.2 Test locally

```bash
bun run dev
```

Test the authorize endpoint:
```bash
curl -X POST http://localhost:3004/authorize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 0xabc123..." \
  -d '{"account": "0xc93947ed78d87bdeb232d9c29c07fd0e8cf0a43e", "signedBy": "0xc93947ed78d87bdeb232d9c29c07fd0e8cf0a43e"}'
```

Expected response:
```json
{
  "allowed": true,
  "sponsored": true,
  "signingKey": "0x72433488d76ffec7a16b..."
}
```

### 3.3 Customize authorization logic (later)

Right now fountain.ink's authorize.ts returns `allowed: true` for everyone.
This is fine for initial setup. In Part 7 we'll add group membership checks.

The file to modify later: `src/authorize.ts` — the `isAllowed` variable.

---

## Step 4: Register Auth Endpoint with Lens

This is the Builder auth step. Create a script in the auth repo or run
it from the current Web3Forum codebase (which already has Builder auth
working in admin-session.ts).

### 4.1 Create the registration script

Create `scripts/register-auth-endpoint.ts` (in either repo):

```ts
import { readFileSync } from "fs";
import { resolve } from "path";
import { PublicClient, mainnet, evmAddress, uri } from "@lens-protocol/client";
import {
  addAppAuthorizationEndpoint,
  addAppSigners,
} from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { lens } from "viem/chains";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
}

// Config — EDIT THESE
const APP = "0x637E685eF29403831dE51A58Bc8230b88549745E";
const AUTH_ENDPOINT_URL = "https://your-auth-server.com/authorize";
const AUTH_API_SECRET = "0xabc123..."; // from Step 2
const SIGNER_ADDRESS = "0x8711d4d6B7536D..."; // from Step 2

async function main() {
  const pk = process.env.PRIVATE_KEY; // your existing Builder wallet
  if (!pk) {
    console.error("PRIVATE_KEY not found");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const wallet = createWalletClient({
    account,
    chain: lens,
    transport: http(),
  });

  const client = PublicClient.create({
    environment: mainnet,
    origin: "https://lensforum.xyz/",
  });

  // Authenticate as Builder
  const challenge = await client.challenge({
    builder: { address: account.address },
  });
  if (challenge.isErr()) {
    console.error("Challenge failed:", challenge.error);
    process.exit(1);
  }

  const signature = await account.signMessage({
    message: challenge.value.text,
  });
  const auth = await client.authenticate({
    id: challenge.value.id,
    signature,
  });
  if (auth.isErr()) {
    console.error("Auth failed:", auth.error);
    process.exit(1);
  }

  const sessionClient = auth.value;
  console.log("Authenticated as Builder");

  // Step A: Register the Authorization Endpoint
  console.log("Registering Authorization Endpoint...");
  const endpointResult = await addAppAuthorizationEndpoint(sessionClient, {
    endpoint: uri(AUTH_ENDPOINT_URL),
    app: evmAddress(APP),
    bearerToken: AUTH_API_SECRET,
  });

  if (endpointResult.isErr()) {
    console.error("Failed to register endpoint:", endpointResult.error);
    process.exit(1);
  }
  console.log("Authorization Endpoint registered!");

  // Step B: Register the App Signer
  console.log("Registering App Signer...");
  const signerResult = await addAppSigners(sessionClient, {
    app: evmAddress(APP),
    signers: [evmAddress(SIGNER_ADDRESS)],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction);

  if (signerResult.isErr()) {
    console.error("Failed to register signer:", signerResult.error);
    process.exit(1);
  }
  console.log("App Signer registered!");

  console.log("\n=== SETUP COMPLETE ===");
  console.log("Auth Endpoint:", AUTH_ENDPOINT_URL);
  console.log("Signer Address:", SIGNER_ADDRESS);
  console.log("App:", APP);
}

main();
```

### 4.2 Run the script

IMPORTANT: Before running, you need the auth server deployed and accessible
at AUTH_ENDPOINT_URL. For initial testing, you can use a tunnel:

```bash
# In one terminal — run auth server
cd society-forum-auth
bun run dev

# In another terminal — expose it
# Using ngrok, cloudflare tunnel, or similar
ngrok http 3004
# This gives you a URL like https://abc123.ngrok.io
```

Update AUTH_ENDPOINT_URL in the script to the tunnel URL + "/authorize",
then run:

```bash
npx tsx scripts/register-auth-endpoint.ts
```

This is a ONE-TIME operation. Once registered, Lens API will call your
endpoint for every login attempt.

### 4.3 Verify it works

After registration, the Lens Developer Dashboard should show your
Authorization Endpoint configured. You can also test by logging in
through any Lens client — the auth server logs should show the request.

---

## Step 5: Configure the Fountain App Fork

### 5.1 Create .env file

```bash
cd society-forum
cp .env.example .env
```

Edit `.env` with your values:

```env
# Supabase — use your existing project or create a new one
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# WalletConnect — reuse from current app
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id

# Environment
NEXT_PUBLIC_ENVIRONMENT=production  # or development for testnet

# YOUR Lens App addresses (not fountain.ink's)
NEXT_PUBLIC_APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
NEXT_PUBLIC_APP_ADDRESS_TESTNET=0x9eD1562A4e3803964F3c84301b18d4E1944D340b

# Lens API keys — get from https://developer.lens.xyz
LENS_API_KEY=your_mainnet_api_key
LENS_API_KEY_TESTNET=your_testnet_api_key

# Supabase service key (for server-side operations)
SUPABASE_JWT_SECRET=your_jwt_secret
SUPABASE_SERVICE_KEY=your_service_key

# Database direct connection (for migrations)
DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# Listmonk — skip for now, not needed for forum
LISTMONK_API_URL=http://localhost:9000/api
LISTMONK_API_USERNAME=admin
LISTMONK_API_TOKEN=placeholder

# Iframely — skip for now
IFRAMELY_BASE_URL=placeholder
```

### 5.2 Supabase setup

Fountain.ink has its own Supabase schema. You have two options:

Option A: New Supabase project (recommended — clean start)
- Create a new project at supabase.com
- Run fountain.ink's migrations: `cd supabase && supabase db push`
- We'll add forum-specific tables in Part 3

Option B: Reuse existing project
- Run fountain.ink's migrations alongside your existing tables
- Risk of conflicts — not recommended

### 5.3 Test the app

```bash
bun run dev
```

Visit http://localhost:3000. You should see fountain.ink's UI.
Try logging in with your Lens account — the auth server should log
the authorization request.

---

## Step 6: Deploy Auth Server

The auth server needs to be publicly accessible for Lens API to call it.

Options (cheapest to most robust):

### Option A: Vercel (simplest)
Convert the Express server to a Vercel serverless function.
Fountain.ink's auth server is simple enough for this.

### Option B: Railway / Render / Fly.io
Deploy as a long-running Node.js service.
```bash
# Example with Railway
railway init
railway up
```

### Option C: VPS (most control)
Deploy on any VPS with Node.js/Bun installed.
```bash
bun run start
```

After deployment, update the AUTH_ENDPOINT_URL in the registration
script and re-run Step 4.2 if the URL changed.

---

## Step 7: Verify End-to-End

### 7.1 Login test
1. Open the fountain fork at localhost:3000
2. Connect wallet
3. Select your Lens account
4. Check auth server logs — should show the authorization request
5. Login should succeed

### 7.2 Publish test
1. Create a test article in the fountain editor
2. Publish it
3. Check auth server logs — should show a verification request
4. The post should appear on Lens (check on Hey.xyz)
5. The post should show your app name in the `app` field

### 7.3 Verify App Verification
On Hey.xyz, find your test post. It should show as published via
your app (LensForum / Society Protocol), not via fountain.ink.
This confirms App Verification is working — the operation was signed
by your signer key.

---

## Step 8: Initial Cleanup of Fountain Fork

Before moving to Part 2, do a light cleanup of the fork to remove
fountain.ink-specific branding and features you won't need:

### 8.1 Remove/skip for now:
- Listmonk newsletter integration (emails/ directory)
- Blog-specific features (multi-blog, blog themes)
- Collaborative editing server (yjs collab — can add back later)

### 8.2 Keep as-is:
- Plate.js editor and all extensions
- Grove storage integration
- Lens client setup
- Supabase integration
- Authentication flow
- Content rendering

### 8.3 Update branding:
- Change app name in metadata
- Update favicon/logo
- Update any hardcoded "Fountain" references

---

## Checklist — Part 1 Complete When:

- [ ] fountain-ink/app forked and running locally
- [ ] fountain-ink/auth forked and running locally
- [ ] Signer keypair generated (SIGNER_PRIVATE_KEY + SIGNER_ADDRESS)
- [ ] API secret generated (AUTH_API_SECRET)
- [ ] Auth server configured with your Lens App addresses
- [ ] Auth server deployed to a public URL
- [ ] Authorization Endpoint registered with Lens (via Builder script)
- [ ] App Signer registered with Lens (via Builder script)
- [ ] Fountain fork configured with your env variables
- [ ] Login works through the fork (auth server logs confirm)
- [ ] Publishing works (post appears on Lens with your app name)
- [ ] App Verification confirmed (post signed by your signer)

---

## Files Created/Modified in This Part

### In auth repo (society-forum-auth/):
```
.env                          ← configured with your keys
```

### In app repo (society-forum/):
```
.env                          ← configured with your keys
```

### In current Web3Forum repo (or auth repo):
```
scripts/register-auth-endpoint.ts  ← one-time Builder registration script
```

---

## Troubleshooting

### "Challenge failed" when running registration script
Your PRIVATE_KEY wallet is not the owner of the Lens App. Verify the
owner address matches by checking the app on the Lens Developer Dashboard.

### Auth server returns 401 to Lens API
The API_SECRET in your .env doesn't match what you registered with
`addAppAuthorizationEndpoint`. Re-run the registration script with
the correct bearerToken.

### Login works but posts don't show your app name
App Verification isn't working. Check:
1. SIGNER_ADDRESS was registered via `addAppSigners`
2. Auth server's /verify endpoint returns a valid signature
3. The PRIVATE_KEY in auth server .env is the SIGNER key, not the Builder key

### Auth endpoint must respond within 500ms
If using serverless (Vercel), watch for cold starts. The Lens API
will deny login if your endpoint takes longer than 500ms. Consider
a warm-up strategy or use a long-running server instead.

---

## Next: Part 2 — Lens Primitives (Groups & Feeds)

With auth working, Part 2 creates the 2 Groups and 2 Feeds that
form the onchain structure of the forum.
