# Master Plan V2: Forum Rebuild on Fountain.ink Fork

## Overview

This is the corrected and consolidated blueprint for rebuilding the
Web3Forum as a fork of fountain.ink. It incorporates all findings from
the fountain.ink codebase review and the subsequent corrections document.

Changes from V1 are marked with **[CORRECTED]** where they differ from
the original plan.

---

## The Thread Model — Definitive Design

### On Lens (Web3 — Source of Truth)

Every piece of content is a full Lens Publication (article type):
- Root post = standalone publication on a Feed
- Reply = standalone publication with `commentOn` pointing to root

The `commentOn` relationship is the permanent, onchain thread structure.
It's recoverable via `fetchPostReferences(rootPostId, [CommentOn])` which
returns all replies ordered by timestamp.

### On Supabase (Web2 — Speed Layer)

Supabase caches thread structure for fast reads:
- Thread metadata (title, category, reply count, last activity)
- Reply ordering (position within thread)
- View counts, voting data (things Lens doesn't track)
- Content text cache (for search, previews, SEO)
- **[CORRECTED]** Content JSON cache (`content_json JSONB`) — Plate.js
  JSON stored at publish time for instant rendering without Lens API calls

### Recovery Strategy (If App Goes Down)

If Supabase is lost, threads can be fully reconstructed from Lens:

```
1. Fetch all posts from your Feed (fetchPosts with feed filter)
2. For each post where commentOn is null → it's a root post (thread)
3. For each root post → fetchPostReferences(rootId, [CommentOn])
4. Order replies by timestamp → thread is reconstructed
5. Content is on Grove → fetch contentUri for each publication
6. contentJson attribute in metadata → rebuild content_json cache
```

### UI Behavior

Thread list page:
```
/boards/commons?category=beginners
  → Query Supabase for threads WHERE category = 'beginners'
  → Show: title, author, reply_count, last_reply_at, views
```

Thread detail page:
```
/thread/[root-publication-id]
  → Fetch root content_json + replies from Supabase (fast, no Lens calls)
  → Render: root article + stacked reply articles (Discourse-style)
  → Each reply shows: author avatar, timestamp, full rich content
  → Fallback to Lens API only if content_json cache is missing
```

Individual reply:
```
/thread/[root-id]/reply/[reply-id]          [CORRECTED from /publication/[id]]
  → Opens as standalone article (fountain.ink reading view)
  → Shows "Part of thread: [thread title]" link back
  → Content from Supabase content_json cache
```

---

## Fountain.ink Codebase — Key Integration Points

**[NEW SECTION]** Understanding these is critical for correct implementation.

### Supabase Clients (Three Variants)

Fountain has three Supabase clients. Using the wrong one causes auth
failures or security issues.

| Client | File | Use When |
|---|---|---|
| Browser client | `src/lib/db/client.ts` | Client components (`"use client"`) |
| Server client | `src/lib/db/server.ts` | API routes, Server Components (has cookie access) |
| Service client | `src/lib/db/service.ts` | Scripts, admin ops (bypasses RLS, uses service key) |

### Lens SDK Split

| Context | Package | Pattern |
|---|---|---|
| Client components (hooks) | `@lens-protocol/react` | `useSessionClient()`, `useAuthenticatedUser()` |
| Server / API routes | `@lens-protocol/client` | `getLensClient()` from `src/lib/lens/client.ts` |
| One-off scripts | `@lens-protocol/client` | `PublicClient.create()` directly |

### Auth Architecture (Two Layers)

1. **Lens Auth Server** — External Express app (fork of `fountain-ink/auth`).
   Lens API calls it to authorize logins and verify operations. Deployed
   separately.
2. **App Auth** — Internal at `src/lib/auth/`. JWT sessions, cookies, app
   tokens. Comes with the fork, no modification needed.

Both are needed. They serve different purposes.

### Existing Route Structure (No Route Groups)

Fountain uses flat top-level routes, NOT `(app)` route groups:
```
src/app/b/[blog]/          — blog pages
src/app/p/[user]/[post]/   — post view
src/app/w/[id]/            — editor (id = draft documentId)
src/app/u/[user]/          — user profile
src/app/settings/          — settings
src/app/search/            — search
```

### Middleware

`src/middleware.ts` handles CORS and token forwarding only. No route
protection — auth is handled at the component/API level. Changes needed:
- Add your forum domain to `allowedOrigins`
- No auth-gating changes required

### Draft Type

`Draft` extends `Database["public"]["Tables"]["drafts"]["Row"]` — it's
tied to the Supabase `drafts` table with many required DB fields. Forum
publish functions must NOT depend on this type directly.

### Editor Component

`PlateEditor` at `src/components/editor/editor.tsx` accepts:
```ts
{
  showToolbar?: boolean
  showToc?: boolean
  username?: string
  readOnly?: boolean
  pathname?: string
  appToken?: string
  value?: string          // JSON.stringify'd Plate.js content
  collaborative?: boolean
}
```

For read-only rendering: `<PlateEditor value={json} readOnly={true} />`

### Existing Supabase Tables (Do Not Touch)

```
users, blogs, posts, drafts, curated, feedback, banlist, chat_messages
```

All forum tables use the `forum_` prefix to avoid conflicts.

---

## Types — ForumDraft

**[CORRECTED]** The plan originally used fountain's `Draft` type. Forum
publish functions use a lightweight `ForumDraft` instead.

```ts
// src/lib/forum/types.ts

export interface ForumDraft {
  title: string
  contentJson: any           // Plate.js JSON
  contentMarkdown: string    // Markdown conversion
  subtitle?: string | null
  coverUrl?: string | null
  tags?: string[]
}
```

- Root post editor: fountain's draft system auto-saves to Supabase.
  On publish, convert `Draft → ForumDraft` via adapter.
- Reply editor: manages state locally in React. Constructs `ForumDraft`
  directly. No draft table involvement.

---

## Parts Breakdown

### Part 1: Foundation — Fork & Auth Setup
- Fork fountain-ink/app and fountain-ink/auth
- Configure for existing Lens App (0x637E...)
- Generate signer keys (SIGNER_PRIVATE_KEY + SIGNER_ADDRESS + AUTH_API_SECRET)
- Deploy auth server to public URL
- Register Authorization Endpoint + App Signer via Builder script
- Configure fountain fork .env with your Lens App addresses
- **[CORRECTED]** Inspect `src/middleware.ts` — add your domain to `allowedOrigins`
- **[CORRECTED]** Inspect `src/env.js` — Listmonk and Iframely env vars are
  required by the schema but can use placeholder values initially
- Verify login flow works (auth server logs confirm)
- Verify publishing works (post appears on Lens with your app name)
- Light cleanup: update branding, skip Listmonk/collab for now

### Part 2: Lens Primitives — Groups & Feeds
- Create Commons Group (MembershipApprovalGroupRule)
- Create Research Group (MembershipApprovalGroupRule)
- Create Commons Feed (GroupGatedFeedRule → Commons Group)
- Create Research Feed (GroupGatedFeedRule → Research Group)
- Register feeds and groups with the Lens App
- Save 4 addresses in `src/lib/forum/constants.ts`
- Define category list in `src/lib/forum/categories.ts`
  (30 categories across 5 sections, replacing 26 feeds)
- Approve yourself as member of both groups
- Verify: posting without membership is rejected
- Verify: posting after approval succeeds

### Part 3: Database Schema
- **[CORRECTED]** Include `content_json JSONB` columns from day one
  (was deferred to Part 9 in original plan)
- Create Supabase tables (all prefixed `forum_`):
  - `forum_categories` — board categories (seeded from categories.ts)
  - `forum_threads` — thread metadata + content caches (text + JSON)
  - `forum_thread_replies` — reply metadata + content caches
  - `forum_votes` — upvotes/downvotes per publication per account
  - `forum_communities` — Lens Groups used as communities
- Helper functions: `forum_add_reply`, `forum_add_thread_to_category`,
  `forum_increment_views`, `forum_apply_vote`
- Full-text search GIN index on threads (title + content_text)
- **[CORRECTED]** Tightened RLS policies:
  - Threads/replies: public read, authenticated insert, author-or-admin update
  - Votes: public read, own-votes-only for write
  - Categories/communities: public read, admin-only write
  - Note: verify JWT claim path against fountain's actual token structure
    before deploying (`request.jwt.claims → metadata → address`)
- Seed 30 categories

### Part 4: Publishing Flow — Root Posts
- Create `ForumDraft` type in `src/lib/forum/types.ts`
- Create `publishThread()` service in `src/lib/forum/publish-thread.ts`
  - **[CORRECTED]** Accepts `sessionClient` as parameter (from `useSessionClient()`)
  - **[CORRECTED]** Uses `ForumDraft` not `Draft`
  - **[CORRECTED]** Passes `contentJson` to Supabase for caching at publish time
  - Builds article metadata with `forumCategory` attribute
  - Uploads to Grove → contentUri
  - Posts to correct Feed (commons or research based on category)
  - Tracks in `forum_threads` table
- Create `/api/forum/threads` API route
  - **[CORRECTED]** Uses server client: `import { createClient } from "@/lib/db/server"`
  - Inserts thread row including `content_json`
  - Increments category thread_count
- Create `ForumPublishDialog` component
  - Title input + category selector (grouped by section)
  - **[CORRECTED]** Uses `usePublishDraft` to read fountain's draft, then
    converts to `ForumDraft` via adapter before publishing
- **[CORRECTED]** Wire into editor at `/w/new?mode=forum` — detect query
  param to show ForumPublishDialog instead of fountain's default.
  Note: `/w/[id]` expects a draft documentId. Handle `id === "new"` by
  creating a draft on the fly (check how `DraftCreateButton` works) or
  use a dedicated route.

### Part 5: Publishing Flow — Replies
- Create `publishReply()` service in `src/lib/forum/publish-reply.ts`
  - **[CORRECTED]** Accepts `sessionClient` as parameter
  - **[CORRECTED]** Uses `ForumDraft` not `Draft`
  - **[CORRECTED]** Passes `contentJson` to Supabase for caching
  - Publishes with `commentOn: { post: rootPublicationId }`
  - Same Feed as root post
  - Stores `forumThreadId` attribute in metadata (recovery belt-and-suspenders)
- Create `/api/forum/replies` API route
  - **[CORRECTED]** Uses server client from `src/lib/db/server`
  - Finds thread, calculates position, inserts reply, updates counters
- Create `ThreadReplyEditor` component
  - **[CORRECTED]** Does NOT use `usePublishDraft` — manages editor state
    locally in React state
  - Constructs `ForumDraft` directly from Plate.js editor value
  - Compact Plate.js editor (no collab, no ToC, no autosave)
  - Mounted at bottom of thread detail page

### Part 6: Thread Display
- **[CORRECTED]** All pages at top-level routes (no `(app)` route group):
  - `src/app/boards/page.tsx` — homepage (board sections)
  - `src/app/boards/[feed]/page.tsx` — thread list by category
  - `src/app/thread/[rootPublicationId]/page.tsx` — thread detail
  - `src/app/thread/[rootPublicationId]/reply/[replyId]/page.tsx` — standalone reply
- **[CORRECTED]** All page data fetching uses server client:
  `import { createClient } from "@/lib/db/server"`
- **[CORRECTED]** Thread detail reads `content_json` from Supabase and
  passes it directly to `<PlateEditor readOnly value={...} />`.
  Falls back to Lens API only if `content_json` is null.
- Board homepage: sections with categories, thread counts, latest activity
- Thread list: pinned first, then by last_reply_at, with pagination
- Thread detail: root post + stacked replies (Discourse-style)
- View count incremented on thread page load

### Part 7: Forum Features — Port from Current Codebase
- **[CORRECTED]** All hooks use `@lens-protocol/react` consistently
  (`useSessionClient`, not `getLensClient()`)
- Voting: Lens reactions + Supabase sync (dual write)
  - `useForumVote` hook
  - `/api/forum/votes` route (server client)
- Moderation: `useHideReply`, `useIsModerator`
  - `/api/forum/replies/[publicationId]/hide` route (server client)
- Group membership: `useJoinGroup`, approve/deny/ban/unban
  - Parameterized by group address (Commons or Research)
- Notifications: `useForumNotifications` — filter to forum feeds
- Profile pages: port from current codebase + add forum activity tab
  - `getUserForumActivity()` queries forum_threads + forum_thread_replies
- Optional: auth endpoint membership check (start with `allowed: true`,
  tighten later)

### Part 8: Navigation & Layout
- Forum header: logo, nav links, search, auth state, "New Thread" button
- **[CORRECTED]** "New Thread" links to `/w/new?mode=forum` (not `/editor/new`)
- Mobile bottom navigation (Boards, Search, Post, Alerts, Profile)
- Homepage with board sections + sidebar
- **[CORRECTED]** Integrate with middleware: add forum domain to
  `allowedOrigins` in `src/middleware.ts`
- Search page: full-text search via Supabase GIN index
  - Uses `forum_search_threads` RPC function
- Notifications page
- Profile page with forum activity tab
- Responsive design: `pb-16 md:pb-0` for mobile nav

### Part 9: Recovery & Sync
- Full recovery script: rebuild all Supabase data from Lens
  - **[CORRECTED]** Uses service client:
    `createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)` from `@supabase/supabase-js`
  - Fetches all posts from both feeds
  - Reconstructs threads via `commentOn` relationships
  - Rebuilds `content_json` cache from metadata attributes
- Incremental sync script: runs every 5 minutes
  - **[CORRECTED]** Uses service client (same as recovery)
  - Catches posts published via other Lens clients
  - Handles deleted posts (mark hidden) and edited posts (refresh cache)
- **[CORRECTED]** Content cache backfill only needed for posts that existed
  before `content_json` column was added (since new posts cache at publish
  time per Parts 4/5)
- Deployment: Vercel cron, Railway cron, or Supabase Edge Function

### Part 10: Polish & Deploy
- ISR caching strategy:
  - `/boards` → 60s, `/boards/[feed]` → 30s, `/thread/[id]` → 30s
  - On-demand revalidation after publish (revalidatePath)
- SEO: dynamic metadata for threads, static for boards, sitemap, robots.txt
- Error handling: error boundaries, not-found pages, API try/catch pattern
- Rate limiting: in-memory for MVP, Upstash Redis for production
- Environment configuration (production .env for app + auth server)
- Deployment:
  - App → Vercel (Next.js)
  - Auth server → Railway / Fly.io (Express)
  - Sync cron → Vercel cron or external
- Health check endpoint at `/api/health`
- RLS policies already tightened in Part 3

---

## Category Map (Replacing 26 Feeds)

### Commons Feed Categories (13)

GENERAL DISCUSSION:
- beginners — "Beginners & Help"
- key-concepts — "4 Key Concepts"
- web3-outpost — "Web3 Outpost"
- dao-governance — "DAO Governance"

PARTNER COMMUNITIES:
- partners-general — "General Discussion"
- announcements — "Announcements"
- network-states — "Network States Communities"
- partner-badges — "Partner Badges & SPEC"

OTHERS:
- meta — "Meta-discussion"
- politics — "Politics & Society"
- economics — "Economics"
- crypto-web3 — "Cryptocurrencies & Web3"
- off-topic — "Off-topic"

### Research Feed Categories (17)

FUNCTIONS (VALUE SYSTEM):
- game-theory — "Economic Game Theory"
- function-ideas — "Function Ideas"
- hunting — "Hunting"
- property — "Property"
- parenting — "Parenting"
- governance-func — "Governance"
- organizations — "Organizations"
- curation — "Curation"
- farming — "Farming"
- portal — "Portal"
- communication — "Communication"

TECHNICAL:
- architecture — "General Architecture Discussion"
- state-machine — "State Machine"
- consensus — "Consensus (Proof of Hunt)"
- cryptography — "Cryptography"
- account-system — "Account System"
- security — "Security"

---

## What Comes From Where

### From fountain-ink/app (fork):
- Next.js project structure and config
- Plate.js editor (all plugins, extensions, toolbar, slash commands)
- Grove storage integration (`src/lib/lens/storage-client.ts`)
- Lens client setup (`src/lib/lens/client.ts`)
- Supabase integration patterns (three client variants)
- Content rendering via PlateEditor readOnly mode
- Authentication UI flow (`src/lib/auth/`, `src/components/auth/`)
- Draft system (reused for root post authoring, skipped for replies)
- Middleware (CORS + token forwarding)

### From fountain-ink/auth (fork):
- Express auth server (confirmed: exists at github.com/fountain-ink/auth)
- Authorization endpoint (/authorize)
- Verification endpoint (/verify)
- OperationApprovalSigner setup
- Key generation script (keygen.ts)

### From current Web3Forum (port):
- Community/Group management logic
- Voting system (adapted to dual-write: Lens reactions + Supabase)
- Moderation tools (hide reply, ban member)
- Notification system (filtered to forum feeds)
- Profile pages (+ new forum activity tab)

### Built new:
- `ForumDraft` type and adapter
- `publishThread()` and `publishReply()` services
- Forum API routes (`/api/forum/threads`, `/api/forum/replies`, `/api/forum/votes`)
- Forum UI components (board sections, thread list, thread detail, reply editor)
- Forum publish dialog with category selector
- Category system (constants + Supabase rows)
- Recovery and sync scripts
- Forum header, mobile nav, search

---

## Key Decisions Locked In

1. 2 Feeds: Commons + Research (not 26)
2. 2 Groups: Commons + Research (with MembershipApprovalGroupRule)
3. Categories = Supabase rows + code constants, not onchain feeds
4. Every reply = full Lens publication with commentOn
5. Thread ordering = Supabase cache, recoverable from Lens timestamps
6. Editor = Plate.js from fountain.ink (same component, readOnly for display)
7. Auth = fountain.ink auth server (external) + app auth (internal, unchanged)
8. **[CORRECTED]** Content cache = `content_text` (plain text for search) +
   `content_json` (Plate.js JSON for rendering) — both cached at publish time
9. Source of truth = Lens Protocol + Grove storage
10. Recovery = fetchPostReferences + timestamps + metadata attributes

---

## Corrections Applied (From Codebase Review)

For reference, these are the 10 issues found during the fountain.ink
codebase review and how they're addressed in this plan:

| # | Issue | Resolution |
|---|---|---|
| 1 | Lens SDK client vs react mixing | Clear rule: react hooks in client components, vanilla client in server/scripts. Publish functions receive sessionClient as param. |
| 2 | Draft type too heavy | New `ForumDraft` interface. Adapter for root posts, direct construction for replies. |
| 3 | Supabase client ambiguity | Explicit mapping: server.ts for API routes/RSC, client.ts for browser, service.ts for scripts. |
| 4 | Auth server fork assumption | Confirmed: fountain-ink/auth repo exists. Both external auth server and internal app auth are needed. |
| 5 | Missing (app) route group | Fountain uses flat top-level routes. Forum pages go at top level: `/boards`, `/thread`, etc. |
| 6 | Routing conflicts | Use `/w/new?mode=forum` for editor. Use `/thread/[id]/reply/[replyId]` for standalone replies. |
| 7 | Content rendering perf | Cache `content_json` in Supabase at publish time (Part 3 schema, Parts 4/5 publish). Lens API is fallback only. |
| 8 | RLS too permissive | Tightened: author-or-admin for updates, own-votes-only for votes. Verify JWT claim path before deploying. |
| 9 | Missing middleware integration | Middleware is CORS-only. Add forum domain to allowedOrigins. No route protection changes needed. |
| 10 | usePublishDraft coupling | Root posts: use it (get autosave for free), convert via adapter. Replies: skip it entirely, local state only. |

---

## Implementation Order & Dependencies

```
Part 1 (Fork & Auth)
  ↓
Part 2 (Groups & Feeds)     — needs Builder auth from Part 1
  ↓
Part 3 (Database Schema)    — independent of Part 2, but do after for clean sequence
  ↓
Part 4 (Publish Root Posts)  — needs Parts 1-3
  ↓
Part 5 (Publish Replies)    — needs Part 4
  ↓
Part 6 (Thread Display)     — needs Parts 4-5 (or test data)
  ↓
Part 7 (Forum Features)     — needs Part 6 for UI integration
  ↓
Part 8 (Navigation & Layout) — needs Parts 6-7
  ↓
Part 9 (Recovery & Sync)    — needs Parts 4-5 (publish flow must exist)
  ↓
Part 10 (Polish & Deploy)   — needs everything
```

Parts 3 and 2 can run in parallel. Parts 6 and 7 have some overlap
and can be interleaved. Part 9 can start as soon as Parts 4-5 are done.

---

## Open Items to Verify During Implementation

1. **JWT claim path for RLS** — Test fountain's actual JWT payload to
   confirm the path to user address and admin flag before deploying
   Part 3's RLS policies.

2. **Draft creation flow** — Fountain's `/w/[id]` expects `id` to be a
   draft `documentId`. Investigate how `DraftCreateButton` creates new
   drafts to determine the right approach for `/w/new?mode=forum`.

3. **Plate.js markdown serialization** — The reply editor needs to convert
   Plate.js JSON to markdown for the Lens metadata `content` field.
   Verify which serializer fountain uses (check `getPostContent()`).

4. **Lens SDK canary version** — Fountain uses `"canary"` for both
   `@lens-protocol/client` and `@lens-protocol/react`. API surfaces may
   differ from stable docs. Test all Lens SDK calls against the actual
   installed version.

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


# Part 2: Lens Primitives — Groups & Feeds

## Goal

Create the 2 Groups and 2 Feeds that form the onchain structure of the forum,
register them with the Lens App, and define the category map. By the end of
this part, you have 2 group-gated feeds ready to receive publications.

---

## Prerequisites

- Part 1 complete (auth endpoint working, Builder auth confirmed)
- Access to the Builder wallet (PRIVATE_KEY in .env.local)
- Grove storage client configured (fountain fork already has this)
- `@lens-protocol/client` and `@lens-protocol/metadata` installed

---

## What Gets Created Onchain

```
Lens App (0x637E...)
├── Commons Group    ← NEW (MembershipApprovalGroupRule)
├── Research Group   ← NEW (MembershipApprovalGroupRule)
├── Commons Feed     ← NEW (GroupGatedFeedRule → Commons Group)
└── Research Feed    ← NEW (GroupGatedFeedRule → Research Group)
```

Each is a separate smart contract deployed to Lens Chain.
The script creates all 4 in sequence, then registers them with the app.

---

## Step 1: Create the Setup Script

Create `scripts/setup-lens-primitives.ts` in the forum app repo (or the
current Web3Forum repo — wherever you have Builder auth working).

This is a ONE-TIME script. Run it once, save the addresses, never run again.

```ts
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  PublicClient,
  mainnet,
  evmAddress,
  uri,
} from "@lens-protocol/client";
import {
  createGroup,
  createFeed,
  addAppFeeds,
  addAppGroups,
  fetchGroup,
  fetchFeed,
} from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { lens } from "viem/chains";
import { group, feed } from "@lens-protocol/metadata";
import { StorageClient, immutable } from "@lens-chain/storage-client";
import { chains } from "@lens-chain/sdk/viem";

// --- Load .env.local ---
const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match)
    process.env[match[1].trim()] = match[2]
      .trim()
      .replace(/^["']|["']$/g, "");
}

// --- Config ---
const APP = "0x637E685eF29403831dE51A58Bc8230b88549745E";
const ADMIN = "0xc93947ed78d87bdeb232d9c29c07fd0e8cf0a43e";

// --- Helpers ---
const storageClient = StorageClient.create();
const acl = immutable(chains.mainnet.id);

async function uploadMetadata(data: object): Promise<string> {
  const { uri: metaUri } = await storageClient.uploadAsJson(data, { acl });
  return metaUri;
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
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
  console.log("Authenticated as Builder\n");

  // =========================================
  // STEP A: Create Commons Group
  // =========================================
  console.log("Creating Commons Group...");

  const commonsGroupMeta = group({
    name: "Society-Commons",
    description:
      "General discussion community for Society Protocol. Covers governance, partners, web3, and open topics.",
  });
  const commonsGroupUri = await uploadMetadata(commonsGroupMeta);

  const commonsGroupResult = await createGroup(sessionClient, {
    metadataUri: uri(commonsGroupUri),
    admins: [evmAddress(ADMIN)],
    rules: {
      required: [{ membershipApprovalRule: { enable: true } }],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchGroup(sessionClient, { txHash }));

  if (commonsGroupResult.isErr()) {
    console.error("Failed to create Commons Group:", commonsGroupResult.error);
    process.exit(1);
  }
  const commonsGroup = commonsGroupResult.value;
  console.log("✓ Commons Group:", commonsGroup.address);

  // =========================================
  // STEP B: Create Research Group
  // =========================================
  console.log("Creating Research Group...");

  const researchGroupMeta = group({
    name: "Society-Research",
    description:
      "Technical research community for Society Protocol. Architecture, cryptography, game theory, and protocol functions.",
  });
  const researchGroupUri = await uploadMetadata(researchGroupMeta);

  const researchGroupResult = await createGroup(sessionClient, {
    metadataUri: uri(researchGroupUri),
    admins: [evmAddress(ADMIN)],
    rules: {
      required: [{ membershipApprovalRule: { enable: true } }],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchGroup(sessionClient, { txHash }));

  if (researchGroupResult.isErr()) {
    console.error(
      "Failed to create Research Group:",
      researchGroupResult.error,
    );
    process.exit(1);
  }
  const researchGroup = researchGroupResult.value;
  console.log("✓ Research Group:", researchGroup.address);

  // =========================================
  // STEP C: Create Commons Feed (gated to Commons Group)
  // =========================================
  console.log("Creating Commons Feed...");

  const commonsFeedMeta = feed({
    name: "Society Commons",
    description:
      "General discussion feed for Society Protocol community members.",
  });
  const commonsFeedUri = await uploadMetadata(commonsFeedMeta);

  const commonsFeedResult = await createFeed(sessionClient, {
    metadataUri: uri(commonsFeedUri),
    admins: [evmAddress(ADMIN)],
    rules: {
      required: [
        {
          groupGatedRule: {
            group: evmAddress(commonsGroup.address),
          },
        },
      ],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchFeed(sessionClient, { txHash }));

  if (commonsFeedResult.isErr()) {
    console.error("Failed to create Commons Feed:", commonsFeedResult.error);
    process.exit(1);
  }
  const commonsFeed = commonsFeedResult.value;
  console.log("✓ Commons Feed:", commonsFeed.address);

  // =========================================
  // STEP D: Create Research Feed (gated to Research Group)
  // =========================================
  console.log("Creating Research Feed...");

  const researchFeedMeta = feed({
    name: "Society Research",
    description:
      "Technical research feed for Society Protocol. Architecture, consensus, cryptography.",
  });
  const researchFeedUri = await uploadMetadata(researchFeedMeta);

  const researchFeedResult = await createFeed(sessionClient, {
    metadataUri: uri(researchFeedUri),
    admins: [evmAddress(ADMIN)],
    rules: {
      required: [
        {
          groupGatedRule: {
            group: evmAddress(researchGroup.address),
          },
        },
      ],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchFeed(sessionClient, { txHash }));

  if (researchFeedResult.isErr()) {
    console.error("Failed to create Research Feed:", researchFeedResult.error);
    process.exit(1);
  }
  const researchFeed = researchFeedResult.value;
  console.log("✓ Research Feed:", researchFeed.address);

  // =========================================
  // STEP E: Register Feeds with App
  // =========================================
  console.log("\nRegistering feeds with app...");

  const addFeedsResult = await addAppFeeds(sessionClient, {
    app: evmAddress(APP),
    feeds: [
      evmAddress(commonsFeed.address),
      evmAddress(researchFeed.address),
    ],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction);

  if (addFeedsResult.isErr()) {
    console.error("Failed to register feeds:", addFeedsResult.error);
    process.exit(1);
  }
  console.log("✓ Feeds registered with app");

  // =========================================
  // STEP F: Register Groups with App
  // =========================================
  console.log("Registering groups with app...");

  const addGroupsResult = await addAppGroups(sessionClient, {
    app: evmAddress(APP),
    groups: [
      evmAddress(commonsGroup.address),
      evmAddress(researchGroup.address),
    ],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction);

  if (addGroupsResult.isErr()) {
    console.error("Failed to register groups:", addGroupsResult.error);
    process.exit(1);
  }
  console.log("✓ Groups registered with app");

  // =========================================
  // OUTPUT — Save these addresses!
  // =========================================
  console.log("\n========================================");
  console.log("SAVE THESE ADDRESSES IN YOUR CONSTANTS:");
  console.log("========================================");
  console.log(`COMMONS_GROUP_ADDRESS  = "${commonsGroup.address}"`);
  console.log(`RESEARCH_GROUP_ADDRESS = "${researchGroup.address}"`);
  console.log(`COMMONS_FEED_ADDRESS   = "${commonsFeed.address}"`);
  console.log(`RESEARCH_FEED_ADDRESS  = "${researchFeed.address}"`);
  console.log("========================================\n");
}

main();
```

---

## Step 2: Run the Script

```bash
npx tsx scripts/setup-lens-primitives.ts
```

The script will output 4 addresses. Save them immediately.

Example output:
```
Authenticated as Builder

Creating Commons Group...
✓ Commons Group: 0xABC123...
Creating Research Group...
✓ Research Group: 0xDEF456...
Creating Commons Feed...
✓ Commons Feed: 0x789GHI...
Creating Research Feed...
✓ Research Feed: 0xJKL012...

Registering feeds with app...
✓ Feeds registered with app
Registering groups with app...
✓ Groups registered with app

========================================
SAVE THESE ADDRESSES IN YOUR CONSTANTS:
========================================
COMMONS_GROUP_ADDRESS  = "0xABC123..."
RESEARCH_GROUP_ADDRESS = "0xDEF456..."
COMMONS_FEED_ADDRESS   = "0x789GHI..."
RESEARCH_FEED_ADDRESS  = "0xJKL012..."
========================================
```

---

## Step 3: Add Addresses to App Constants

In the fountain fork, create a constants file:

```ts
// src/lib/forum/constants.ts

// Lens App
export const APP_ADDRESS = "0x637E685eF29403831dE51A58Bc8230b88549745E";

// Forum Groups (onchain — MembershipApprovalGroupRule)
export const COMMONS_GROUP_ADDRESS = "0xABC123...";  // paste from script output
export const RESEARCH_GROUP_ADDRESS = "0xDEF456..."; // paste from script output

// Forum Feeds (onchain — GroupGatedFeedRule)
export const COMMONS_FEED_ADDRESS = "0x789GHI...";   // paste from script output
export const RESEARCH_FEED_ADDRESS = "0xJKL012...";  // paste from script output

// Admin
export const ADMIN_ADDRESS = "0xc93947ed78d87bdeb232d9c29c07fd0e8cf0a43e";

// Feed type mapping
export const FEED_MAP = {
  commons: COMMONS_FEED_ADDRESS,
  research: RESEARCH_FEED_ADDRESS,
} as const;

export type FeedType = keyof typeof FEED_MAP;
```

---

## Step 4: Define the Category Map

Create the category configuration that replaces the 26 feeds:

```ts
// src/lib/forum/categories.ts

import type { FeedType } from "./constants";

export interface Category {
  slug: string;
  name: string;
  description: string;
  section: string;
  feed: FeedType;
  displayOrder: number;
}

export interface Section {
  id: string;
  title: string;
  feed: FeedType;
  layout: "list" | "grid";
  categories: Category[];
}

export const SECTIONS: Section[] = [
  {
    id: "general",
    title: "GENERAL DISCUSSION",
    feed: "commons",
    layout: "list",
    categories: [
      { slug: "beginners", name: "Beginners & Help", description: "New to the forum? Start here.", section: "general", feed: "commons", displayOrder: 1 },
      { slug: "key-concepts", name: "4 Key Concepts", description: "Core concepts and fundamental principles.", section: "general", feed: "commons", displayOrder: 2 },
      { slug: "web3-outpost", name: "Web3 Outpost", description: "Web3 integration, badges, and specs.", section: "general", feed: "commons", displayOrder: 3 },
      { slug: "dao-governance", name: "DAO Governance", description: "Governance discussions and proposals.", section: "general", feed: "commons", displayOrder: 4 },
    ],
  },
  {
    id: "partners",
    title: "PARTNER COMMUNITIES",
    feed: "commons",
    layout: "list",
    categories: [
      { slug: "partners-general", name: "General Discussion", description: "Partner community discussions.", section: "partners", feed: "commons", displayOrder: 5 },
      { slug: "announcements", name: "Announcements", description: "Official partner news and updates.", section: "partners", feed: "commons", displayOrder: 6 },
      { slug: "network-states", name: "Network States", description: "Current and upcoming network states.", section: "partners", feed: "commons", displayOrder: 7 },
      { slug: "partner-badges", name: "Partner Badges & SPEC", description: "Badge systems for partners.", section: "partners", feed: "commons", displayOrder: 8 },
    ],
  },
  {
    id: "functions",
    title: "FUNCTIONS (VALUE SYSTEM)",
    feed: "research",
    layout: "grid",
    categories: [
      { slug: "game-theory", name: "Economic Game Theory", description: "Economic models and game theory.", section: "functions", feed: "research", displayOrder: 9 },
      { slug: "function-ideas", name: "Function Ideas", description: "Propose and discuss new functions.", section: "functions", feed: "research", displayOrder: 10 },
      { slug: "hunting", name: "Hunting", description: "Resource discovery strategies.", section: "functions", feed: "research", displayOrder: 11 },
      { slug: "property", name: "Property", description: "Property rights and ownership.", section: "functions", feed: "research", displayOrder: 12 },
      { slug: "parenting", name: "Parenting", description: "Community growth and mentorship.", section: "functions", feed: "research", displayOrder: 13 },
      { slug: "governance-func", name: "Governance", description: "Decision-making structures.", section: "functions", feed: "research", displayOrder: 14 },
      { slug: "organizations", name: "Organizations", description: "Organizational design.", section: "functions", feed: "research", displayOrder: 15 },
      { slug: "curation", name: "Curation", description: "Content and quality curation.", section: "functions", feed: "research", displayOrder: 16 },
      { slug: "farming", name: "Farming", description: "Value creation strategies.", section: "functions", feed: "research", displayOrder: 17 },
      { slug: "portal", name: "Portal", description: "Gateway and integration.", section: "functions", feed: "research", displayOrder: 18 },
      { slug: "communication", name: "Communication", description: "Communication protocols.", section: "functions", feed: "research", displayOrder: 19 },
    ],
  },
  {
    id: "technical",
    title: "SOCIETY PROTOCOL TECHNICAL SECTION",
    feed: "research",
    layout: "list",
    categories: [
      { slug: "architecture", name: "General Architecture", description: "System architecture and design.", section: "technical", feed: "research", displayOrder: 20 },
      { slug: "state-machine", name: "State Machine", description: "State transitions and logic.", section: "technical", feed: "research", displayOrder: 21 },
      { slug: "consensus", name: "Consensus (Proof of Hunt)", description: "Consensus mechanisms.", section: "technical", feed: "research", displayOrder: 22 },
      { slug: "cryptography", name: "Cryptography", description: "Cryptographic primitives.", section: "technical", feed: "research", displayOrder: 23 },
      { slug: "account-system", name: "Account System", description: "Accounts and identity.", section: "technical", feed: "research", displayOrder: 24 },
      { slug: "security", name: "Security", description: "Security protocols.", section: "technical", feed: "research", displayOrder: 25 },
    ],
  },
  {
    id: "others",
    title: "OTHERS",
    feed: "commons",
    layout: "list",
    categories: [
      { slug: "meta", name: "Meta-discussion", description: "About the forum itself.", section: "others", feed: "commons", displayOrder: 26 },
      { slug: "politics", name: "Politics & Society", description: "Political impacts on society.", section: "others", feed: "commons", displayOrder: 27 },
      { slug: "economics", name: "Economics", description: "Economic models and theories.", section: "others", feed: "commons", displayOrder: 28 },
      { slug: "crypto-web3", name: "Cryptocurrencies & Web3", description: "The broader crypto landscape.", section: "others", feed: "commons", displayOrder: 29 },
      { slug: "off-topic", name: "Off-topic", description: "Anything unrelated to the protocol.", section: "others", feed: "commons", displayOrder: 30 },
    ],
  },
];

// Flat lookup helpers
export const ALL_CATEGORIES = SECTIONS.flatMap((s) => s.categories);
export const getCategoryBySlug = (slug: string) =>
  ALL_CATEGORIES.find((c) => c.slug === slug);
export const getCategoriesByFeed = (feed: FeedType) =>
  ALL_CATEGORIES.filter((c) => c.feed === feed);
export const getCategoriesBySection = (sectionId: string) =>
  SECTIONS.find((s) => s.id === sectionId)?.categories ?? [];
```

---

## Step 5: Verify Onchain State

After running the script, verify everything is correct:

### 5.1 Check groups exist
```ts
import { fetchGroup } from "@lens-protocol/client/actions";

const commons = await fetchGroup(client, {
  group: evmAddress(COMMONS_GROUP_ADDRESS),
});
console.log("Commons Group:", commons.value?.metadata?.name);
// Should print: "Society-Commons"

const research = await fetchGroup(client, {
  group: evmAddress(RESEARCH_GROUP_ADDRESS),
});
console.log("Research Group:", research.value?.metadata?.name);
// Should print: "Society-Research"
```

### 5.2 Check feeds exist and are gated
```ts
import { fetchFeed } from "@lens-protocol/client/actions";

const commonsFeed = await fetchFeed(client, {
  feed: evmAddress(COMMONS_FEED_ADDRESS),
});
console.log("Commons Feed:", commonsFeed.value?.metadata?.name);
console.log("Rules:", commonsFeed.value?.rules);
// Should show groupGatedRule pointing to Commons Group

const researchFeed = await fetchFeed(client, {
  feed: evmAddress(RESEARCH_FEED_ADDRESS),
});
console.log("Research Feed:", researchFeed.value?.metadata?.name);
console.log("Rules:", researchFeed.value?.rules);
// Should show groupGatedRule pointing to Research Group
```

### 5.3 Test posting (should fail without group membership)
Try posting to the Commons Feed without being a member of the Commons Group.
It should be rejected by the GroupGatedFeedRule. This confirms gating works.

### 5.4 Approve yourself as a member
```ts
import { joinGroup, approveGroupMembershipRequests } from "@lens-protocol/client/actions";

// First, request to join (as your regular account)
await joinGroup(userSessionClient, {
  group: evmAddress(COMMONS_GROUP_ADDRESS),
});

// Then, approve (as admin/Builder)
await approveGroupMembershipRequests(adminSessionClient, {
  group: evmAddress(COMMONS_GROUP_ADDRESS),
  members: [evmAddress(YOUR_ACCOUNT_ADDRESS)],
});
```

After approval, posting to the Commons Feed should succeed.

---

## Step 6: Approve Initial Members

For each person who should have access to the forum, they need to:
1. Request to join the group (via `joinGroup`)
2. Be approved by an admin (via `approveGroupMembershipRequests`)

For the initial launch, approve yourself and any co-founders/moderators.
The UI for member management will be built in Part 7.

---

## Checklist — Part 2 Complete When:

- [ ] Setup script created and tested
- [ ] Commons Group created onchain with MembershipApprovalGroupRule
- [ ] Research Group created onchain with MembershipApprovalGroupRule
- [ ] Commons Feed created onchain with GroupGatedFeedRule → Commons Group
- [ ] Research Feed created onchain with GroupGatedFeedRule → Research Group
- [ ] Both feeds registered with the Lens App
- [ ] Both groups registered with the Lens App
- [ ] 4 addresses saved in constants file
- [ ] Category map defined (30 categories across 5 sections)
- [ ] Verified: posting without group membership is rejected
- [ ] Verified: posting after approval succeeds
- [ ] At least 1 member (yourself) approved in both groups

---

## Addresses Reference (After Running Script)

Update this section with actual addresses after running:

```
COMMONS_GROUP_ADDRESS  = "0x________________"
RESEARCH_GROUP_ADDRESS = "0x________________"
COMMONS_FEED_ADDRESS   = "0x________________"
RESEARCH_FEED_ADDRESS  = "0x________________"
```

---

## Next: Part 3 — Database Schema

With the onchain primitives in place, Part 3 designs the Supabase tables
that cache thread structure, categories, and forum metadata for fast reads.

# Part 3: Database Schema

## Goal

Create the Supabase tables that power the forum's speed layer. These tables
cache thread structure, reply ordering, categories, votes, and content text
for fast reads, search, and SEO. The source of truth remains Lens Protocol
+ Grove storage. Supabase is the fast cache that can be rebuilt from onchain
data if lost.

---

## Prerequisites

- Part 2 complete (Groups + Feeds created, addresses saved)
- Supabase project configured (from Part 1)
- Access to Supabase SQL Editor or CLI (`supabase db push`)

---

## Design Principles

1. **Supabase = cache, Lens = truth.** Every row references a Lens publication ID.
   If Supabase is wiped, threads can be reconstructed from `fetchPostReferences`.
2. **Content is cached, not stored.** The `content_text` columns hold plain text
   extracted from the article for search and previews. The full rich content
   lives on Grove (via `content_uri`).
3. **No duplication of Lens data.** We don't store author profiles, follower
   counts, or reaction data. We store only what Lens can't give us fast enough:
   thread ordering, view counts, category assignments, votes.
4. **Coexist with fountain.ink tables.** Fountain already has `users`, `blogs`,
   `posts`, `drafts`, etc. Our forum tables are additive — prefixed or namespaced
   to avoid conflicts.

---

## Migration File

Create `supabase/migrations/20260401_forum_schema.sql`:

```sql
-- ============================================
-- Forum Schema for Society Protocol
-- Sits alongside fountain.ink's existing tables
-- ============================================


-- ============================================
-- 1. CATEGORIES
-- Static reference table. Seeded from categories.ts config.
-- Could also be purely in code, but having it in DB allows
-- dynamic category management later.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  section TEXT NOT NULL,          -- 'general', 'partners', 'functions', 'technical', 'others'
  feed TEXT NOT NULL,             -- 'commons' or 'research'
  display_order INTEGER NOT NULL DEFAULT 0,
  thread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_categories_section ON forum_categories(section);
CREATE INDEX idx_forum_categories_feed ON forum_categories(feed);
CREATE INDEX idx_forum_categories_order ON forum_categories(display_order);


-- ============================================
-- 2. THREADS
-- One row per forum thread. Links to a root Lens publication.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lens reference (source of truth)
  root_publication_id TEXT UNIQUE NOT NULL,   -- Lens post ID of the root article
  content_uri TEXT,                            -- Grove URI for full content

  -- Forum metadata
  feed TEXT NOT NULL,                          -- 'commons' or 'research'
  category TEXT NOT NULL REFERENCES forum_categories(slug),
  title TEXT NOT NULL,
  summary TEXT,                                -- first ~200 chars for preview
  content_text TEXT,                           -- full plain text for search

  -- Author (Lens account address)
  author_address TEXT NOT NULL,
  author_username TEXT,                        -- cached lens username for display

  -- Counters
  reply_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Moderation
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,    -- no new replies
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE     -- soft delete
);

CREATE INDEX idx_forum_threads_category ON forum_threads(category);
CREATE INDEX idx_forum_threads_feed ON forum_threads(feed);
CREATE INDEX idx_forum_threads_author ON forum_threads(author_address);
CREATE INDEX idx_forum_threads_created ON forum_threads(created_at DESC);
CREATE INDEX idx_forum_threads_last_reply ON forum_threads(last_reply_at DESC NULLS LAST);
CREATE INDEX idx_forum_threads_pinned ON forum_threads(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_forum_threads_root_pub ON forum_threads(root_publication_id);

-- Full text search index on title + content
CREATE INDEX idx_forum_threads_search ON forum_threads
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, '')));


-- ============================================
-- 3. THREAD REPLIES
-- One row per reply in a thread. Each reply is a full Lens publication
-- linked via commentOn to the root post.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_thread_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Thread reference
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,

  -- Lens reference (source of truth)
  publication_id TEXT UNIQUE NOT NULL,         -- Lens post ID of this reply
  content_uri TEXT,                            -- Grove URI for full content

  -- Position in thread (for display ordering)
  position INTEGER NOT NULL,                   -- 1-based, sequential

  -- Content cache
  content_text TEXT,                           -- plain text for search/preview
  summary TEXT,                                -- first ~200 chars

  -- Author
  author_address TEXT NOT NULL,
  author_username TEXT,

  -- Counters
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Moderation
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_forum_replies_thread ON forum_thread_replies(thread_id);
CREATE INDEX idx_forum_replies_position ON forum_thread_replies(thread_id, position);
CREATE INDEX idx_forum_replies_author ON forum_thread_replies(author_address);
CREATE INDEX idx_forum_replies_pub ON forum_thread_replies(publication_id);
CREATE INDEX idx_forum_replies_created ON forum_thread_replies(created_at);


-- ============================================
-- 4. VOTES
-- Tracks upvotes/downvotes per publication per account.
-- Works for both threads (root posts) and replies.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id TEXT NOT NULL,                -- Lens post ID (thread root or reply)
  account_address TEXT NOT NULL,               -- voter's Lens account
  direction SMALLINT NOT NULL,                 -- 1 = upvote, -1 = downvote

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_vote UNIQUE (publication_id, account_address),
  CONSTRAINT valid_direction CHECK (direction IN (-1, 1))
);

CREATE INDEX idx_forum_votes_pub ON forum_votes(publication_id);
CREATE INDEX idx_forum_votes_account ON forum_votes(account_address);


-- ============================================
-- 5. COMMUNITIES
-- Tracks Lens Groups used as language/topic communities.
-- These are the "LOCAL" communities from the current app.
-- ============================================

CREATE TABLE IF NOT EXISTS forum_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_group_address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT,                                -- e.g., 'en', 'es', 'zh'
  members_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_communities_featured
  ON forum_communities(is_featured) WHERE is_featured = TRUE;


-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Increment reply count + update last_reply_at on a thread
CREATE OR REPLACE FUNCTION forum_add_reply(
  p_thread_id UUID,
  p_reply_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_threads
  SET reply_count = reply_count + 1,
      last_reply_at = p_reply_time,
      updated_at = NOW()
  WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Increment thread count on a category
CREATE OR REPLACE FUNCTION forum_add_thread_to_category(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_categories
  SET thread_count = thread_count + 1
  WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql;

-- Increment view count (called on thread page load)
CREATE OR REPLACE FUNCTION forum_increment_views(p_thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_threads
  SET views_count = views_count + 1
  WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Apply a vote (upsert: insert or flip direction)
CREATE OR REPLACE FUNCTION forum_apply_vote(
  p_publication_id TEXT,
  p_account TEXT,
  p_direction SMALLINT
)
RETURNS VOID AS $$
DECLARE
  old_direction SMALLINT;
  is_thread BOOLEAN;
BEGIN
  -- Check for existing vote
  SELECT direction INTO old_direction
  FROM forum_votes
  WHERE publication_id = p_publication_id AND account_address = p_account;

  IF FOUND THEN
    IF old_direction = p_direction THEN
      -- Same vote again → remove it
      DELETE FROM forum_votes
      WHERE publication_id = p_publication_id AND account_address = p_account;

      -- Reverse the count
      is_thread := EXISTS (SELECT 1 FROM forum_threads WHERE root_publication_id = p_publication_id);
      IF is_thread THEN
        IF p_direction = 1 THEN
          UPDATE forum_threads SET upvotes = upvotes - 1 WHERE root_publication_id = p_publication_id;
        ELSE
          UPDATE forum_threads SET downvotes = downvotes - 1 WHERE root_publication_id = p_publication_id;
        END IF;
      ELSE
        IF p_direction = 1 THEN
          UPDATE forum_thread_replies SET upvotes = upvotes - 1 WHERE publication_id = p_publication_id;
        ELSE
          UPDATE forum_thread_replies SET downvotes = downvotes - 1 WHERE publication_id = p_publication_id;
        END IF;
      END IF;
    ELSE
      -- Different direction → flip
      UPDATE forum_votes SET direction = p_direction
      WHERE publication_id = p_publication_id AND account_address = p_account;

      is_thread := EXISTS (SELECT 1 FROM forum_threads WHERE root_publication_id = p_publication_id);
      IF is_thread THEN
        IF p_direction = 1 THEN
          UPDATE forum_threads SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE root_publication_id = p_publication_id;
        ELSE
          UPDATE forum_threads SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE root_publication_id = p_publication_id;
        END IF;
      ELSE
        IF p_direction = 1 THEN
          UPDATE forum_thread_replies SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE publication_id = p_publication_id;
        ELSE
          UPDATE forum_thread_replies SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE publication_id = p_publication_id;
        END IF;
      END IF;
    END IF;
  ELSE
    -- New vote
    INSERT INTO forum_votes (publication_id, account_address, direction)
    VALUES (p_publication_id, p_account, p_direction);

    is_thread := EXISTS (SELECT 1 FROM forum_threads WHERE root_publication_id = p_publication_id);
    IF is_thread THEN
      IF p_direction = 1 THEN
        UPDATE forum_threads SET upvotes = upvotes + 1 WHERE root_publication_id = p_publication_id;
      ELSE
        UPDATE forum_threads SET downvotes = downvotes + 1 WHERE root_publication_id = p_publication_id;
      END IF;
    ELSE
      IF p_direction = 1 THEN
        UPDATE forum_thread_replies SET upvotes = upvotes + 1 WHERE publication_id = p_publication_id;
      ELSE
        UPDATE forum_thread_replies SET downvotes = downvotes + 1 WHERE publication_id = p_publication_id;
      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_communities ENABLE ROW LEVEL SECURITY;

-- Categories: public read, admin write
CREATE POLICY "Public read categories" ON forum_categories FOR SELECT USING (true);
CREATE POLICY "Admin write categories" ON forum_categories FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'metadata')::json->>'isAdmin' = 'true'
);

-- Threads: public read, authenticated insert/update
CREATE POLICY "Public read threads" ON forum_threads FOR SELECT USING (true);
CREATE POLICY "Authenticated insert threads" ON forum_threads FOR INSERT WITH CHECK (true);
CREATE POLICY "Author or admin update threads" ON forum_threads FOR UPDATE USING (true);

-- Replies: public read, authenticated insert
CREATE POLICY "Public read replies" ON forum_thread_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated insert replies" ON forum_thread_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Author or admin update replies" ON forum_thread_replies FOR UPDATE USING (true);

-- Votes: public read, authenticated insert/update/delete
CREATE POLICY "Public read votes" ON forum_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated manage votes" ON forum_votes FOR ALL USING (true);

-- Communities: public read, admin write
CREATE POLICY "Public read communities" ON forum_communities FOR SELECT USING (true);
CREATE POLICY "Admin write communities" ON forum_communities FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'metadata')::json->>'isAdmin' = 'true'
);
```

---

## Seed Data: Categories

Create `supabase/migrations/20260401_seed_categories.sql`:

```sql
-- ============================================
-- Seed forum categories
-- Matches the category map from Part 2 (categories.ts)
-- ============================================

INSERT INTO forum_categories (slug, name, description, section, feed, display_order) VALUES
-- GENERAL DISCUSSION
('beginners',       'Beginners & Help',       'New to the forum? Start here.',                'general',   'commons',  1),
('key-concepts',    '4 Key Concepts',         'Core concepts and fundamental principles.',    'general',   'commons',  2),
('web3-outpost',    'Web3 Outpost',           'Web3 integration, badges, and specs.',         'general',   'commons',  3),
('dao-governance',  'DAO Governance',         'Governance discussions and proposals.',         'general',   'commons',  4),

-- PARTNER COMMUNITIES
('partners-general','General Discussion',     'Partner community discussions.',                'partners',  'commons',  5),
('announcements',   'Announcements',          'Official partner news and updates.',            'partners',  'commons',  6),
('network-states',  'Network States',         'Current and upcoming network states.',          'partners',  'commons',  7),
('partner-badges',  'Partner Badges & SPEC',  'Badge systems for partners.',                   'partners',  'commons',  8),

-- FUNCTIONS (VALUE SYSTEM)
('game-theory',     'Economic Game Theory',   'Economic models and game theory.',              'functions', 'research', 9),
('function-ideas',  'Function Ideas',         'Propose and discuss new functions.',             'functions', 'research', 10),
('hunting',         'Hunting',                'Resource discovery strategies.',                 'functions', 'research', 11),
('property',        'Property',               'Property rights and ownership.',                 'functions', 'research', 12),
('parenting',       'Parenting',              'Community growth and mentorship.',               'functions', 'research', 13),
('governance-func', 'Governance',             'Decision-making structures.',                    'functions', 'research', 14),
('organizations',   'Organizations',          'Organizational design.',                         'functions', 'research', 15),
('curation',        'Curation',               'Content and quality curation.',                  'functions', 'research', 16),
('farming',         'Farming',                'Value creation strategies.',                     'functions', 'research', 17),
('portal',          'Portal',                 'Gateway and integration.',                       'functions', 'research', 18),
('communication',   'Communication',          'Communication protocols.',                       'functions', 'research', 19),

-- TECHNICAL SECTION
('architecture',    'General Architecture',   'System architecture and design.',                'technical', 'research', 20),
('state-machine',   'State Machine',          'State transitions and logic.',                   'technical', 'research', 21),
('consensus',       'Consensus (Proof of Hunt)','Consensus mechanisms.',                        'technical', 'research', 22),
('cryptography',    'Cryptography',           'Cryptographic primitives.',                      'technical', 'research', 23),
('account-system',  'Account System',         'Accounts and identity.',                         'technical', 'research', 24),
('security',        'Security',               'Security protocols.',                             'technical', 'research', 25),

-- OTHERS
('meta',            'Meta-discussion',        'About the forum itself.',                        'others',    'commons',  26),
('politics',        'Politics & Society',     'Political impacts on society.',                  'others',    'commons',  27),
('economics',       'Economics',              'Economic models and theories.',                  'others',    'commons',  28),
('crypto-web3',     'Cryptocurrencies & Web3','The broader crypto landscape.',                  'others',    'commons',  29),
('off-topic',       'Off-topic',              'Anything unrelated to the protocol.',            'others',    'commons',  30);
```

---

## How Tables Map to the App

### Thread list page (`/boards/commons?category=beginners`)
```sql
SELECT id, root_publication_id, title, summary, author_username,
       reply_count, views_count, upvotes, downvotes,
       last_reply_at, created_at, is_pinned
FROM forum_threads
WHERE category = 'beginners' AND is_hidden = FALSE
ORDER BY is_pinned DESC, last_reply_at DESC NULLS LAST
LIMIT 20 OFFSET 0;
```

### Thread detail page (`/thread/[root-publication-id]`)
```sql
-- Root thread
SELECT * FROM forum_threads WHERE root_publication_id = $1;

-- Replies ordered by position
SELECT * FROM forum_thread_replies
WHERE thread_id = $1 AND is_hidden = FALSE
ORDER BY position ASC;
```

### Board homepage (category listing with stats)
```sql
SELECT c.*, 
  (SELECT MAX(t.last_reply_at) FROM forum_threads t WHERE t.category = c.slug) as latest_activity
FROM forum_categories c
WHERE c.section = 'general'
ORDER BY c.display_order;
```

### Search
```sql
SELECT id, root_publication_id, title, summary, category, author_username, created_at
FROM forum_threads
WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_text,''))
      @@ plainto_tsquery('english', $1)
  AND is_hidden = FALSE
ORDER BY created_at DESC
LIMIT 20;
```

### Voting
```sql
-- Apply vote (uses the helper function)
SELECT forum_apply_vote('lens-post-id-123', '0xUserAddress', 1);  -- upvote
SELECT forum_apply_vote('lens-post-id-123', '0xUserAddress', -1); -- downvote
SELECT forum_apply_vote('lens-post-id-123', '0xUserAddress', 1);  -- toggle off

-- Check user's vote on a post
SELECT direction FROM forum_votes
WHERE publication_id = $1 AND account_address = $2;
```

---

## Recovery: Rebuilding from Lens

If Supabase is lost, this is the reconstruction logic (implemented in Part 9):

```
For each feed (commons, research):
  1. fetchPosts(client, { filter: { feeds: [{ feed: FEED_ADDRESS }] } })
  2. For each post where commentOn is null:
     → It's a thread root
     → Extract title from metadata
     → Determine category from metadata tags (or default)
     → INSERT INTO forum_threads
  3. For each thread root:
     → fetchPostReferences(rootId, [CommentOn])
     → Order by timestamp
     → INSERT INTO forum_thread_replies with position = index + 1
     → UPDATE forum_threads SET reply_count = count
```

The `content_text` cache is rebuilt by fetching each `content_uri` from Grove
and extracting plain text from the article JSON.

---

## Relationship to Fountain.ink Tables

Fountain.ink's existing tables (untouched):
- `users` — user profiles, JWT auth
- `blogs` — user blogs (we may repurpose or ignore)
- `posts` — published articles (fountain's concept of a post)
- `drafts` — unpublished drafts
- `curated` — curated content
- `feedback` — user feedback
- `banlist` — banned users
- `chat_messages` — real-time chat

Our forum tables (new, prefixed with `forum_`):
- `forum_categories` — board categories
- `forum_threads` — thread metadata + content cache
- `forum_thread_replies` — reply metadata + content cache
- `forum_votes` — upvotes/downvotes
- `forum_communities` — language/topic community groups

No conflicts. The `forum_` prefix keeps everything clean.

We may later create a bridge between fountain's `posts` table and our
`forum_threads` table (since both reference Lens publications), but
that's a Part 9 concern.

---

## Checklist — Part 3 Complete When:

- [ ] Migration file created (`20260401_forum_schema.sql`)
- [ ] Seed file created (`20260401_seed_categories.sql`)
- [ ] Migrations applied to Supabase (`supabase db push` or SQL Editor)
- [ ] 30 categories seeded and visible in Supabase dashboard
- [ ] All 5 tables created with indexes
- [ ] RLS policies active
- [ ] Helper functions created (forum_add_reply, forum_apply_vote, etc.)
- [ ] Test queries work in SQL Editor

---

## Next: Part 4 — Publishing Flow (Root Posts)

With the database ready, Part 4 adapts fountain.ink's editor and publishing
flow to create forum threads: Plate.js editor → full article → publish to
Feed → track in forum_threads table.


# Part 4: Publishing Flow — Root Posts

## Goal

Adapt fountain.ink's editor and publishing flow so users can create forum
threads. The flow: Plate.js editor → add title + category → publish as full
Lens article to the correct Feed → track in `forum_threads` table. By the
end of this part, a user can create a new thread that appears in the board.

---

## Prerequisites

- Part 1 complete (auth working)
- Part 2 complete (Groups + Feeds created, addresses in constants)
- Part 3 complete (Supabase tables created, categories seeded)
- Fountain fork running locally with Plate.js editor functional

---

## How Fountain's Publishing Works (What We're Adapting)

Fountain's current flow:
```
1. User writes in Plate.js editor → content stored as JSON (draft)
2. User clicks "Publish" → PublishDialog opens with tabs:
   - Details (title, subtitle, cover, slug, tags)
   - Distribution (which blog/group to post to, newsletter)
   - Monetization (collecting settings)
3. On submit:
   a. getPostContent() → converts to markdown
   b. getPostAttributes() → stores contentJson, subtitle, coverUrl as metadata attributes
   c. article() from @lens-protocol/metadata → builds metadata object
   d. storageClient.uploadAsJson(metadata) → uploads to Grove → gets contentUri
   e. post(lens, { contentUri, feed }) → publishes to Lens
   f. createPostRecord() → saves to Supabase posts table
```

Our forum adaptation:
```
1. User writes in Plate.js editor → same (keep as-is)
2. User clicks "Create Thread" → ForumPublishDialog opens:
   - Title (required)
   - Category selector (required — picks from forum_categories)
   - Tags (optional)
   - Summary auto-generated from first ~200 chars
3. On submit:
   a. Same content pipeline (markdown + attributes + article metadata)
   b. Upload to Grove → contentUri
   c. Determine feed from category (commons or research)
   d. post(lens, { contentUri, feed: FEED_ADDRESS })
   e. Insert into forum_threads table
   f. Increment category thread_count
```

The key difference: we replace the blog/distribution/monetization tabs with
a simple category selector, and we write to `forum_threads` instead of
fountain's `posts` table.

---

## Step 1: Create the Forum Publish Service

This is the core function that publishes a thread. It mirrors fountain's
`publish-post.ts` but targets the forum.

```ts
// src/lib/forum/publish-thread.ts

import { uri } from "@lens-protocol/client"
import { fetchPost, post } from "@lens-protocol/client/actions"
import { handleOperationWith } from "@lens-protocol/client/viem"
import { article } from "@lens-protocol/metadata"
import { MetadataAttributeType } from "@lens-protocol/metadata"
import type { Draft } from "@/components/draft/draft"
import { getLensClient } from "@/lib/lens/client"
import { storageClient } from "@/lib/lens/storage-client"
import { getUserAccount } from "@/lib/auth/get-user-profile"
import { FEED_MAP, type FeedType } from "./constants"
import { getCategoryBySlug } from "./categories"
import { evmAddress } from "@lens-protocol/client"

export interface PublishThreadArgs {
  draft: Draft
  category: string          // category slug
  walletClient: any
}

export interface PublishThreadResult {
  success: boolean
  publicationId?: string
  error?: string
}

export async function publishThread({
  draft,
  category,
  walletClient,
}: PublishThreadArgs): Promise<PublishThreadResult> {
  // Validate category
  const cat = getCategoryBySlug(category)
  if (!cat) {
    return { success: false, error: `Invalid category: ${category}` }
  }

  // Get user
  const { username, address } = await getUserAccount()
  if (!username || !address) {
    return { success: false, error: "Not logged in" }
  }

  // Get Lens session
  const lens = await getLensClient()
  if (!lens.isSessionClient()) {
    return { success: false, error: "No Lens session" }
  }

  // Build metadata (same pattern as fountain's publish-post.ts)
  const contentMarkdown = draft.contentMarkdown || ""
  const contentJson = draft.contentJson

  const attributes = [
    {
      key: "contentJson",
      type: MetadataAttributeType.JSON,
      value: JSON.stringify(contentJson),
    },
    {
      key: "forumCategory",
      type: MetadataAttributeType.STRING,
      value: category,
    },
  ]

  if (draft.subtitle) {
    attributes.push({
      key: "subtitle",
      type: MetadataAttributeType.STRING,
      value: draft.subtitle,
    })
  }

  if (draft.coverUrl) {
    attributes.push({
      key: "coverUrl",
      type: MetadataAttributeType.STRING,
      value: draft.coverUrl,
    })
  }

  const metadata = article({
    title: draft.title || "Untitled",
    content: contentMarkdown,
    locale: "en",
    tags: [category, ...(draft.tags || [])],
    attributes,
  })

  // Upload to Grove
  const { uri: contentUri } = await storageClient.uploadAsJson(metadata)
  if (!contentUri) {
    return { success: false, error: "Failed to upload content" }
  }

  // Determine feed from category
  const feedAddress = FEED_MAP[cat.feed]

  // Publish to Lens
  const result = await post(lens, {
    contentUri: uri(contentUri),
    feed: evmAddress(feedAddress),
  })
    .andThen(handleOperationWith(walletClient))
    .andThen(lens.waitForTransaction)

  if (result.isErr()) {
    return { success: false, error: `Publish failed: ${result.error}` }
  }

  // Fetch the created post to get its ID
  const postResult = await fetchPost(lens, { txHash: result.value })
  if (postResult.isErr() || !postResult.value) {
    return { success: false, error: "Published but failed to fetch post" }
  }

  const publicationId = postResult.value.id

  // Track in Supabase
  await trackThread({
    publicationId,
    contentUri,
    feed: cat.feed,
    category,
    title: draft.title || "Untitled",
    summary: contentMarkdown.slice(0, 200),
    contentText: contentMarkdown,
    authorAddress: address,
    authorUsername: username,
  })

  return { success: true, publicationId }
}

async function trackThread(params: {
  publicationId: string
  contentUri: string
  feed: string
  category: string
  title: string
  summary: string
  contentText: string
  authorAddress: string
  authorUsername: string
}) {
  const res = await fetch("/api/forum/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    console.error("Failed to track thread in Supabase:", await res.text())
  }
}
```

---

## Step 2: Create the API Route for Thread Tracking

```ts
// src/app/api/forum/threads/route.ts

import { createClient } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = await createClient()

  const { error } = await db.from("forum_threads").insert({
    root_publication_id: body.publicationId,
    content_uri: body.contentUri,
    feed: body.feed,
    category: body.category,
    title: body.title,
    summary: body.summary,
    content_text: body.contentText,
    author_address: body.authorAddress,
    author_username: body.authorUsername,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Increment category thread count
  await db.rpc("forum_add_thread_to_category", { p_slug: body.category })

  return NextResponse.json({ success: true })
}
```

---

## Step 3: Create the Forum Publish Dialog

This replaces fountain's multi-tab PublishDialog with a simpler forum-focused
version. It reuses fountain's form infrastructure (react-hook-form + zod).

```tsx
// src/components/forum/forum-publish-dialog.tsx

"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useWalletClient } from "wagmi"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { SECTIONS } from "@/lib/forum/categories"
import { publishThread } from "@/lib/forum/publish-thread"
import { usePublishDraft } from "@/hooks/use-publish-draft"

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.string().min(1, "Select a category"),
})

type FormValues = z.infer<typeof schema>

interface Props {
  documentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForumPublishDialog({ documentId, open, onOpenChange }: Props) {
  const [isPublishing, setIsPublishing] = useState(false)
  const { getDraft, updateDraft } = usePublishDraft(documentId)
  const { data: walletClient } = useWalletClient()
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: getDraft()?.title || "",
      category: "",
    },
  })

  async function onSubmit(values: FormValues) {
    const draft = getDraft()
    if (!draft) {
      toast.error("No draft found")
      return
    }
    if (!walletClient) {
      toast.error("Wallet not connected")
      return
    }

    setIsPublishing(true)
    const pending = toast.loading("Publishing thread...")

    // Update draft with title before publishing
    updateDraft({ title: values.title })
    const updatedDraft = { ...draft, title: values.title }

    const result = await publishThread({
      draft: updatedDraft,
      category: values.category,
      walletClient,
    })

    toast.dismiss(pending)
    setIsPublishing(false)

    if (result.success) {
      toast.success("Thread published!")
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["drafts"] })
      router.push(`/thread/${result.publicationId}`)
    } else {
      toast.error(result.error || "Failed to publish")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Thread</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Thread title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SECTIONS.map((section) => (
                        <div key={section.id}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {section.title}
                          </div>
                          {section.categories.map((cat) => (
                            <SelectItem key={cat.slug} value={cat.slug}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish Thread"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Step 4: Wire the Dialog into the Editor Page

Fountain's editor page has a "Publish" button that opens the PublishDialog.
We add a parallel "Create Thread" button that opens our ForumPublishDialog.

The exact integration point depends on fountain's editor layout, but the
pattern is:

```tsx
// In the editor page or toolbar component

import { ForumPublishDialog } from "@/components/forum/forum-publish-dialog"

// Add state
const [forumDialogOpen, setForumDialogOpen] = useState(false)

// Add button (alongside or replacing fountain's publish button)
<Button onClick={() => setForumDialogOpen(true)}>
  Create Thread
</Button>

<ForumPublishDialog
  documentId={documentId}
  open={forumDialogOpen}
  onOpenChange={setForumDialogOpen}
/>
```

---

## Step 5: Category Tag in Metadata

When publishing, the category slug is stored in two places:

1. **Lens metadata tags** — `tags: [category, ...userTags]`
   This makes the category discoverable onchain. During recovery,
   we can read the first tag to determine which category a post belongs to.

2. **Lens metadata attributes** — `{ key: "forumCategory", value: category }`
   Explicit attribute for unambiguous category identification.

3. **Supabase** — `forum_threads.category` column.
   Fast lookup for the UI.

This triple-storage ensures the category survives even if Supabase is lost.
The recovery script (Part 9) reads the `forumCategory` attribute from the
publication metadata to reconstruct the category assignment.

---

## Step 6: Content Caching Strategy

When a thread is created, we cache two text representations in Supabase:

- `summary` — first ~200 characters of the markdown, used in thread list previews
- `content_text` — full plain text, used for full-text search

The full rich content (Plate.js JSON + markdown) lives on Grove via `content_uri`.
When rendering the thread detail page, we fetch from Grove for the rich view.
For list pages, we use the Supabase summary.

This gives us:
- Fast list pages (Supabase only, no Grove calls)
- Rich detail pages (Grove fetch for full content)
- Working search (Postgres full-text on content_text)

---

## Data Flow Summary

```
User writes in Plate.js editor
  ↓
Clicks "Create Thread"
  ↓
ForumPublishDialog: enters title, selects category
  ↓
publishThread():
  ├─ Build article metadata (title, markdown, contentJson, tags, attributes)
  ├─ Upload to Grove → contentUri
  ├─ Determine feed from category (commons or research)
  ├─ post(lens, { contentUri, feed }) → publish to Lens
  ├─ fetchPost(lens, { txHash }) → get publication ID
  └─ POST /api/forum/threads → insert into Supabase
       ├─ forum_threads row created
       └─ forum_categories.thread_count incremented
  ↓
Redirect to /thread/[publicationId]
```

---

## Checklist — Part 4 Complete When:

- [ ] `publish-thread.ts` service created
- [ ] `/api/forum/threads` API route created
- [ ] `ForumPublishDialog` component created
- [ ] Dialog wired into editor page
- [ ] User can write content in Plate.js editor
- [ ] User can select a category and publish
- [ ] Publication appears on Lens (verify on Hey.xyz)
- [ ] Thread row appears in `forum_threads` table
- [ ] Category `thread_count` incremented
- [ ] Content cached in Supabase (summary + content_text)
- [ ] `forumCategory` attribute present in publication metadata

---

## Next: Part 5 — Publishing Flow (Replies)

With root posts working, Part 5 adds the reply flow: same rich editor,
but publishes with `commentOn` pointing to the root post, and tracks
the reply in `forum_thread_replies` with a position number.

# Part 5: Publishing Flow — Replies

## Goal

Allow users to reply to a thread using the same rich Plate.js editor.
Each reply is a full Lens publication with `commentOn` pointing to the
root post, published to the same Feed as the root. Supabase tracks the
reply's position in the thread. By the end of this part, a thread can
accumulate replies displayed in order.

---

## Prerequisites

- Part 4 complete (root post publishing works)
- Thread detail page route exists (even if bare — Part 6 builds the full UI)
- `forum_thread_replies` table created (Part 3)

---

## How Replies Differ From Root Posts

| Aspect | Root Post (Part 4) | Reply (Part 5) |
|---|---|---|
| Lens `commentOn` | null | `{ post: rootPublicationId }` |
| Feed | determined by category | same feed as root post |
| Title | required | optional (can be empty) |
| Category | user selects | inherited from thread |
| Supabase table | `forum_threads` | `forum_thread_replies` |
| Position | N/A | sequential integer (1, 2, 3...) |
| Editor | full Plate.js | full Plate.js (identical) |
| Metadata attribute | `forumCategory` | `forumThreadId` (root pub ID) |

The reply is a first-class Lens article. On Hey.xyz it appears as a
standalone publication that happens to be a comment on the root post.
On our forum UI, it's displayed as reply #N in the thread.

---

## Step 1: Create the Reply Publishing Service

```ts
// src/lib/forum/publish-reply.ts

import { postId as lensPostId, uri, evmAddress } from "@lens-protocol/client"
import { fetchPost, post } from "@lens-protocol/client/actions"
import { handleOperationWith } from "@lens-protocol/client/viem"
import { article } from "@lens-protocol/metadata"
import { MetadataAttributeType } from "@lens-protocol/metadata"
import type { Draft } from "@/components/draft/draft"
import { getLensClient } from "@/lib/lens/client"
import { storageClient } from "@/lib/lens/storage-client"
import { getUserAccount } from "@/lib/auth/get-user-profile"
import { FEED_MAP, type FeedType } from "./constants"

export interface PublishReplyArgs {
  draft: Draft
  threadRootPublicationId: string   // Lens post ID of the thread root
  threadFeed: FeedType              // 'commons' or 'research'
  walletClient: any
}

export interface PublishReplyResult {
  success: boolean
  publicationId?: string
  error?: string
}

export async function publishReply({
  draft,
  threadRootPublicationId,
  threadFeed,
  walletClient,
}: PublishReplyArgs): Promise<PublishReplyResult> {
  const { username, address } = await getUserAccount()
  if (!username || !address) {
    return { success: false, error: "Not logged in" }
  }

  const lens = await getLensClient()
  if (!lens.isSessionClient()) {
    return { success: false, error: "No Lens session" }
  }

  const contentMarkdown = draft.contentMarkdown || ""
  const contentJson = draft.contentJson

  // Build metadata — same rich article format as root posts
  const attributes = [
    {
      key: "contentJson",
      type: MetadataAttributeType.JSON,
      value: JSON.stringify(contentJson),
    },
    {
      key: "forumThreadId",
      type: MetadataAttributeType.STRING,
      value: threadRootPublicationId,
    },
  ]

  const metadata = article({
    title: draft.title || "",
    content: contentMarkdown,
    locale: "en",
    tags: draft.tags || [],
    attributes,
  })

  // Upload to Grove
  const { uri: contentUri } = await storageClient.uploadAsJson(metadata)
  if (!contentUri) {
    return { success: false, error: "Failed to upload content" }
  }

  // Publish to Lens with commentOn
  const feedAddress = FEED_MAP[threadFeed]

  const result = await post(lens, {
    contentUri: uri(contentUri),
    feed: evmAddress(feedAddress),
    commentOn: {
      post: lensPostId(threadRootPublicationId),
    },
  })
    .andThen(handleOperationWith(walletClient))
    .andThen(lens.waitForTransaction)

  if (result.isErr()) {
    return { success: false, error: `Publish failed: ${result.error}` }
  }

  // Fetch the created post
  const postResult = await fetchPost(lens, { txHash: result.value })
  if (postResult.isErr() || !postResult.value) {
    return { success: false, error: "Published but failed to fetch post" }
  }

  const publicationId = postResult.value.id

  // Track in Supabase
  await trackReply({
    threadRootPublicationId,
    publicationId,
    contentUri,
    contentText: contentMarkdown,
    summary: contentMarkdown.slice(0, 200),
    authorAddress: address,
    authorUsername: username,
  })

  return { success: true, publicationId }
}

async function trackReply(params: {
  threadRootPublicationId: string
  publicationId: string
  contentUri: string
  contentText: string
  summary: string
  authorAddress: string
  authorUsername: string
}) {
  const res = await fetch("/api/forum/replies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    console.error("Failed to track reply:", await res.text())
  }
}
```

---

## Step 2: Create the API Route for Reply Tracking

```ts
// src/app/api/forum/replies/route.ts

import { createClient } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = await createClient()

  // Find the thread
  const { data: thread, error: threadError } = await db
    .from("forum_threads")
    .select("id, reply_count")
    .eq("root_publication_id", body.threadRootPublicationId)
    .single()

  if (threadError || !thread) {
    return NextResponse.json(
      { error: "Thread not found" },
      { status: 404 },
    )
  }

  // Next position = current reply_count + 1
  const position = thread.reply_count + 1

  // Insert reply
  const { error: insertError } = await db
    .from("forum_thread_replies")
    .insert({
      thread_id: thread.id,
      publication_id: body.publicationId,
      content_uri: body.contentUri,
      position,
      content_text: body.contentText,
      summary: body.summary,
      author_address: body.authorAddress,
      author_username: body.authorUsername,
    })

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    )
  }

  // Update thread counters
  await db.rpc("forum_add_reply", {
    p_thread_id: thread.id,
    p_reply_time: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, position })
}
```

---

## Step 3: Create the Reply Editor Component

The reply editor lives at the bottom of the thread detail page. It's a
smaller version of the full Plate.js editor — same capabilities, but
presented inline rather than as a full-page editor.

```tsx
// src/components/forum/thread-reply-editor.tsx

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWalletClient } from "wagmi"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { publishReply } from "@/lib/forum/publish-reply"
import type { FeedType } from "@/lib/forum/constants"
import type { Draft } from "@/components/draft/draft"

// Reuse fountain's Plate editor component
// The exact import depends on how fountain structures its editor
// This is the integration point — use their PlateEditor in a compact form

interface Props {
  threadRootPublicationId: string
  threadFeed: FeedType
  onReplyPublished?: () => void
}

export function ThreadReplyEditor({
  threadRootPublicationId,
  threadFeed,
  onReplyPublished,
}: Props) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [editorContent, setEditorContent] = useState<any>(null)
  const { data: walletClient } = useWalletClient()
  const router = useRouter()

  async function handlePublish() {
    if (!editorContent || !walletClient) {
      toast.error("Write something first")
      return
    }

    setIsPublishing(true)
    const pending = toast.loading("Publishing reply...")

    // Build a minimal Draft object from the editor content
    // The exact shape depends on how fountain's editor exposes content
    const draft: Draft = {
      contentJson: editorContent,
      contentMarkdown: extractMarkdown(editorContent),
      title: "",
      // ... other Draft fields with defaults
    } as Draft

    const result = await publishReply({
      draft,
      threadRootPublicationId,
      threadFeed,
      walletClient,
    })

    toast.dismiss(pending)
    setIsPublishing(false)

    if (result.success) {
      toast.success("Reply published!")
      // Clear editor
      setEditorContent(null)
      // Refresh thread to show new reply
      onReplyPublished?.()
      router.refresh()
    } else {
      toast.error(result.error || "Failed to publish reply")
    }
  }

  return (
    <div className="border rounded-lg p-4 mt-6">
      <h3 className="text-sm font-medium mb-3">Write a reply</h3>

      {/*
        Mount fountain's Plate editor here in compact mode.
        The exact component depends on fountain's editor API.
        Key: same rich editing capabilities as root posts.

        <PlateEditor
          readOnly={false}
          showToolbar={true}
          showToc={false}
          value={JSON.stringify(editorContent || initialValue)}
          onChange={setEditorContent}
        />
      */}
      <div className="min-h-[200px] border rounded mb-3">
        {/* Plate editor mounted here */}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handlePublish}
          disabled={isPublishing || !editorContent}
        >
          {isPublishing ? "Publishing..." : "Post Reply"}
        </Button>
      </div>
    </div>
  )
}

// Helper to extract markdown from Plate.js JSON
// Fountain already has this — reuse their serialization
function extractMarkdown(contentJson: any): string {
  // Use fountain's existing markdown serializer
  // or plate's built-in serialization
  // This is a placeholder — the actual implementation
  // depends on fountain's editor setup
  return JSON.stringify(contentJson)
}
```

---

## Step 4: Integration Notes for Plate.js Editor

Fountain's editor is initialized in `src/components/editor/editor.tsx` with:
- `createPlateEditor()` with plugins from `getEditorPlugins()`
- Rich elements from `getRichElements()`
- Optional collaborative editing via YjsPlugin

For the reply editor, we reuse the same setup but:
- No collaborative editing (replies are single-author)
- No table of contents sidebar
- Compact toolbar (fewer buttons, or floating toolbar only)
- No autosave to drafts (replies are published directly)

The key function to reuse is `getEditorPlugins()` — it configures all the
formatting capabilities (bold, italic, headings, code blocks, images, etc.).

Fountain stores the editor content as Plate.js JSON in the `contentJson`
field of the Draft, and converts to markdown via `getPostContent()` for
the Lens metadata. The reply flow does the same thing.

---

## Step 5: The `forumThreadId` Metadata Attribute

Each reply stores `forumThreadId` in its Lens metadata attributes:

```ts
{
  key: "forumThreadId",
  type: MetadataAttributeType.STRING,
  value: threadRootPublicationId,  // e.g., "0x01-0x42"
}
```

This serves two purposes:

1. **Recovery** — If Supabase is lost, the recovery script reads this
   attribute to know which thread a reply belongs to, even without
   relying on the `commentOn` field (belt and suspenders).

2. **Cross-app identification** — Other apps can read this attribute
   to understand that this publication is a forum reply, not a
   standalone article.

Combined with `commentOn`, there are now two independent ways to
reconstruct thread structure from onchain data:
- `commentOn` → Lens-native parent-child relationship
- `forumThreadId` attribute → explicit thread membership

---

## Step 6: Position Assignment

Positions are assigned sequentially: `reply_count + 1` at the time of
insertion. This is simple and works for a linear thread model (Discourse-style).

Edge case: two replies submitted simultaneously could get the same position.
The API route handles this by reading `reply_count` from the thread row,
which is updated atomically by `forum_add_reply()`. If a race condition
occurs, the unique constraint on `publication_id` prevents duplicate rows,
and the position might have a gap — acceptable for a forum.

For stricter ordering, the recovery script (Part 9) can re-number positions
based on `created_at` timestamps.

---

## Data Flow Summary

```
User is viewing a thread (/thread/[rootPubId])
  ↓
Writes reply in Plate.js editor at bottom of page
  ↓
Clicks "Post Reply"
  ↓
publishReply():
  ├─ Build article metadata (content, contentJson, forumThreadId attribute)
  ├─ Upload to Grove → contentUri
  ├─ post(lens, { contentUri, feed, commentOn: { post: rootPubId } })
  ├─ fetchPost(lens, { txHash }) → get reply publication ID
  └─ POST /api/forum/replies
       ├─ Find thread by root_publication_id
       ├─ Calculate position = reply_count + 1
       ├─ Insert into forum_thread_replies
       └─ forum_add_reply() → increment reply_count + update last_reply_at
  ↓
Thread page refreshes, new reply appears at bottom
```

---

## Onchain Result

After a thread with 3 replies, the Lens state looks like:

```
Publication A (root)
  ├─ commentOn: null
  ├─ feed: COMMONS_FEED
  ├─ metadata.attributes: [{ forumCategory: "beginners" }]
  │
  ├── Publication B (reply #1)
  │   ├─ commentOn: A
  │   ├─ feed: COMMONS_FEED
  │   └─ metadata.attributes: [{ forumThreadId: "A" }]
  │
  ├── Publication C (reply #2)
  │   ├─ commentOn: A
  │   ├─ feed: COMMONS_FEED
  │   └─ metadata.attributes: [{ forumThreadId: "A" }]
  │
  └── Publication D (reply #3)
      ├─ commentOn: A
      ├─ feed: COMMONS_FEED
      └─ metadata.attributes: [{ forumThreadId: "A" }]
```

Supabase state:
```
forum_threads:
  { root_publication_id: "A", category: "beginners", reply_count: 3 }

forum_thread_replies:
  { publication_id: "B", thread_id: <uuid>, position: 1 }
  { publication_id: "C", thread_id: <uuid>, position: 2 }
  { publication_id: "D", thread_id: <uuid>, position: 3 }
```

Recovery from Lens alone:
```
fetchPostReferences("A", [CommentOn]) → [B, C, D] ordered by timestamp
→ position 1 = B, position 2 = C, position 3 = D
```

---

## Checklist — Part 5 Complete When:

- [ ] `publish-reply.ts` service created
- [ ] `/api/forum/replies` API route created
- [ ] `ThreadReplyEditor` component created with Plate.js editor
- [ ] Reply editor mounted on thread detail page
- [ ] User can write rich content and publish a reply
- [ ] Reply appears on Lens with `commentOn` pointing to root post
- [ ] Reply row appears in `forum_thread_replies` with correct position
- [ ] Thread's `reply_count` and `last_reply_at` updated
- [ ] `forumThreadId` attribute present in reply metadata
- [ ] Content cached in Supabase (summary + content_text)
- [ ] Multiple replies maintain correct sequential positions

---

## Next: Part 6 — Thread Display

With both root posts and replies publishable, Part 6 builds the UI:
board listing, thread list, thread detail (stacked replies), and
individual publication view.

# Part 6: Thread Display

## Goal

Build the forum UI pages: board homepage (sections + categories), thread
list (filtered by category), thread detail (root post + stacked replies
in Discourse style), and individual publication view. By the end of this
part, users can browse boards, read threads, and navigate between them.

---

## Prerequisites

- Part 4 complete (root posts can be published)
- Part 5 complete (replies can be published)
- Supabase tables populated with at least test data
- Fountain's Plate.js editor renders in `readOnly` mode

---

## Pages Overview

```
/                                    → Homepage (board sections)
/boards/:feed?category=:slug        → Thread list for a category
/thread/:rootPublicationId           → Thread detail (root + replies)
/publication/:publicationId          → Standalone article view (for a reply)
```

---

## Page 1: Homepage — Board Sections

Route: `/` (or `/boards`)

Displays all sections with their categories, thread counts, and latest
activity. This replaces the current Web3Forum homepage.

### Data Fetching

```ts
// src/lib/forum/get-board-sections.ts

import { createClient } from "@/lib/db/client"
import { SECTIONS } from "./categories"

export interface BoardCategory {
  slug: string
  name: string
  description: string
  threadCount: number
  latestActivity: string | null
}

export interface BoardSection {
  id: string
  title: string
  layout: "list" | "grid"
  categories: BoardCategory[]
}

export async function getBoardSections(): Promise<BoardSection[]> {
  const db = await createClient()

  const { data: dbCategories } = await db
    .from("forum_categories")
    .select("slug, thread_count")

  // Get latest activity per category
  const { data: latestThreads } = await db
    .from("forum_threads")
    .select("category, last_reply_at, created_at")
    .eq("is_hidden", false)
    .order("last_reply_at", { ascending: false, nullsFirst: false })

  // Build a map of latest activity per category
  const activityMap = new Map<string, string>()
  for (const t of latestThreads || []) {
    if (!activityMap.has(t.category)) {
      activityMap.set(t.category, t.last_reply_at || t.created_at)
    }
  }

  const countMap = new Map(
    (dbCategories || []).map((c) => [c.slug, c.thread_count]),
  )

  return SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    layout: section.layout,
    categories: section.categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      threadCount: countMap.get(cat.slug) || 0,
      latestActivity: activityMap.get(cat.slug) || null,
    })),
  }))
}
```

### Page Component

```tsx
// src/app/(app)/boards/page.tsx

import { getBoardSections } from "@/lib/forum/get-board-sections"
import { BoardSectionList } from "@/components/forum/board-section-list"

export const dynamic = "force-dynamic"

export default async function BoardsPage() {
  const sections = await getBoardSections()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {sections.map((section) => (
        <BoardSectionList key={section.id} section={section} />
      ))}
    </div>
  )
}
```

### Section Component

```tsx
// src/components/forum/board-section-list.tsx

import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"
import type { BoardSection } from "@/lib/forum/get-board-sections"

export function BoardSectionList({ section }: { section: BoardSection }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold tracking-wider text-muted-foreground mb-3">
        {section.title}
      </h2>

      <div className="border rounded-lg divide-y">
        {section.categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/boards/commons?category=${cat.slug}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{cat.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {cat.description}
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-muted-foreground ml-4">
              <div className="text-right w-16">
                <div className="font-medium">{cat.threadCount}</div>
                <div>threads</div>
              </div>
              {cat.latestActivity && (
                <div className="text-right w-20">
                  {formatRelativeTime(cat.latestActivity)}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

## Page 2: Thread List — Category View

Route: `/boards/:feed?category=:slug`

Shows all threads in a category, sorted by latest activity (pinned first).

### Data Fetching

```ts
// src/lib/forum/get-threads.ts

import { createClient } from "@/lib/db/client"

export interface ThreadListItem {
  id: string
  rootPublicationId: string
  title: string
  summary: string | null
  authorUsername: string | null
  authorAddress: string
  replyCount: number
  viewsCount: number
  upvotes: number
  downvotes: number
  lastReplyAt: string | null
  createdAt: string
  isPinned: boolean
  isLocked: boolean
}

export async function getThreadsByCategory(
  category: string,
  page = 1,
  pageSize = 20,
): Promise<{ threads: ThreadListItem[]; total: number }> {
  const db = await createClient()
  const offset = (page - 1) * pageSize

  const { data, count, error } = await db
    .from("forum_threads")
    .select("*", { count: "exact" })
    .eq("category", category)
    .eq("is_hidden", false)
    .order("is_pinned", { ascending: false })
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1)

  if (error) throw error

  return {
    threads: (data || []).map((t) => ({
      id: t.id,
      rootPublicationId: t.root_publication_id,
      title: t.title,
      summary: t.summary,
      authorUsername: t.author_username,
      authorAddress: t.author_address,
      replyCount: t.reply_count,
      viewsCount: t.views_count,
      upvotes: t.upvotes,
      downvotes: t.downvotes,
      lastReplyAt: t.last_reply_at,
      createdAt: t.created_at,
      isPinned: t.is_pinned,
      isLocked: t.is_locked,
    })),
    total: count || 0,
  }
}
```

### Page Component

```tsx
// src/app/(app)/boards/[feed]/page.tsx

import { getThreadsByCategory } from "@/lib/forum/get-threads"
import { getCategoryBySlug, SECTIONS } from "@/lib/forum/categories"
import { ThreadListView } from "@/components/forum/thread-list-view"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface Props {
  params: { feed: string }
  searchParams: { category?: string; page?: string }
}

export default async function ThreadListPage({ params, searchParams }: Props) {
  const category = searchParams.category
  if (!category) return notFound()

  const cat = getCategoryBySlug(category)
  if (!cat) return notFound()

  const page = Number(searchParams.page) || 1
  const { threads, total } = await getThreadsByCategory(category, page)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link href="/boards" className="hover:underline">Boards</Link>
        {" / "}
        <span>{cat.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{cat.name}</h1>
          <p className="text-sm text-muted-foreground">{cat.description}</p>
        </div>
        <Link
          href="/editor/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          New Thread
        </Link>
      </div>

      <ThreadListView threads={threads} total={total} page={page} />
    </div>
  )
}
```

### Thread List Component

```tsx
// src/components/forum/thread-list-view.tsx

import Link from "next/link"
import { Pin, Lock, MessageSquare, Eye, ArrowUp } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import type { ThreadListItem } from "@/lib/forum/get-threads"

interface Props {
  threads: ThreadListItem[]
  total: number
  page: number
}

export function ThreadListView({ threads, total, page }: Props) {
  if (threads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No threads yet. Be the first to start a discussion.
      </div>
    )
  }

  return (
    <div className="border rounded-lg divide-y">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`/thread/${thread.rootPublicationId}`}
          className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          {/* Vote score */}
          <div className="flex flex-col items-center w-10 text-xs">
            <ArrowUp className="h-3 w-3" />
            <span className="font-medium">
              {thread.upvotes - thread.downvotes}
            </span>
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {thread.isPinned && <Pin className="h-3 w-3 text-primary" />}
              {thread.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
              <span className="font-medium text-sm truncate">
                {thread.title}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              by {thread.authorUsername || thread.authorAddress.slice(0, 10)}
              {" · "}
              {formatRelativeTime(thread.createdAt)}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {thread.replyCount}
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {thread.viewsCount}
            </div>
            {thread.lastReplyAt && (
              <div className="w-20 text-right">
                {formatRelativeTime(thread.lastReplyAt)}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
```

---

## Page 3: Thread Detail — Stacked Replies (Discourse Style)

Route: `/thread/:rootPublicationId`

The core forum experience. Shows the root post as a full article, followed
by all replies stacked vertically, each rendered with the same rich content
renderer. This is the Discourse-style layout.

### Data Fetching

```ts
// src/lib/forum/get-thread-detail.ts

import { createClient } from "@/lib/db/client"

export interface ThreadDetail {
  id: string
  rootPublicationId: string
  contentUri: string | null
  feed: string
  category: string
  title: string
  authorAddress: string
  authorUsername: string | null
  replyCount: number
  viewsCount: number
  upvotes: number
  downvotes: number
  isPinned: boolean
  isLocked: boolean
  createdAt: string
}

export interface ThreadReply {
  id: string
  publicationId: string
  contentUri: string | null
  position: number
  authorAddress: string
  authorUsername: string | null
  summary: string | null
  upvotes: number
  downvotes: number
  isHidden: boolean
  createdAt: string
}

export async function getThreadDetail(rootPublicationId: string) {
  const db = await createClient()

  const { data: thread } = await db
    .from("forum_threads")
    .select("*")
    .eq("root_publication_id", rootPublicationId)
    .single()

  if (!thread) return null

  // Increment views
  await db.rpc("forum_increment_views", { p_thread_id: thread.id })

  const { data: replies } = await db
    .from("forum_thread_replies")
    .select("*")
    .eq("thread_id", thread.id)
    .eq("is_hidden", false)
    .order("position", { ascending: true })

  return {
    thread: {
      id: thread.id,
      rootPublicationId: thread.root_publication_id,
      contentUri: thread.content_uri,
      feed: thread.feed,
      category: thread.category,
      title: thread.title,
      authorAddress: thread.author_address,
      authorUsername: thread.author_username,
      replyCount: thread.reply_count,
      viewsCount: thread.views_count + 1,
      upvotes: thread.upvotes,
      downvotes: thread.downvotes,
      isPinned: thread.is_pinned,
      isLocked: thread.is_locked,
      createdAt: thread.created_at,
    } as ThreadDetail,
    replies: (replies || []).map((r) => ({
      id: r.id,
      publicationId: r.publication_id,
      contentUri: r.content_uri,
      position: r.position,
      authorAddress: r.author_address,
      authorUsername: r.author_username,
      summary: r.summary,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      isHidden: r.is_hidden,
      createdAt: r.created_at,
    })) as ThreadReply[],
  }
}
```

### Page Component

```tsx
// src/app/(app)/thread/[rootPublicationId]/page.tsx

import { getThreadDetail } from "@/lib/forum/get-thread-detail"
import { getCategoryBySlug } from "@/lib/forum/categories"
import { ThreadDetailView } from "@/components/forum/thread-detail-view"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface Props {
  params: { rootPublicationId: string }
}

export default async function ThreadPage({ params }: Props) {
  const result = await getThreadDetail(params.rootPublicationId)
  if (!result) return notFound()

  const { thread, replies } = result
  const category = getCategoryBySlug(thread.category)

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link href="/boards" className="hover:underline">Boards</Link>
        {" / "}
        <Link
          href={`/boards/${thread.feed}?category=${thread.category}`}
          className="hover:underline"
        >
          {category?.name || thread.category}
        </Link>
      </div>

      <ThreadDetailView thread={thread} replies={replies} />
    </div>
  )
}
```

### Thread Detail Component

This is the Discourse-style stacked view. Each post (root + replies) is
rendered using fountain's Plate.js editor in `readOnly` mode.

```tsx
// src/components/forum/thread-detail-view.tsx

"use client"

import { formatRelativeTime } from "@/lib/utils"
import { ArrowUp, ArrowDown, Lock, Pin, ExternalLink } from "lucide-react"
import Link from "next/link"
import type { ThreadDetail, ThreadReply } from "@/lib/forum/get-thread-detail"
import type { FeedType } from "@/lib/forum/constants"
import { ThreadReplyEditor } from "./thread-reply-editor"
import { ForumPostContent } from "./forum-post-content"

interface Props {
  thread: ThreadDetail
  replies: ThreadReply[]
}

export function ThreadDetailView({ thread, replies }: Props) {
  return (
    <div>
      {/* Thread header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {thread.isPinned && <Pin className="h-4 w-4 text-primary" />}
          {thread.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          <h1 className="text-2xl font-bold">{thread.title}</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          {thread.replyCount} replies · {thread.viewsCount} views
        </div>
      </div>

      {/* Root post — post #0 */}
      <ForumPostCard
        publicationId={thread.rootPublicationId}
        contentUri={thread.contentUri}
        authorUsername={thread.authorUsername}
        authorAddress={thread.authorAddress}
        createdAt={thread.createdAt}
        upvotes={thread.upvotes}
        downvotes={thread.downvotes}
        position={0}
        isRoot
      />

      {/* Replies — stacked vertically */}
      {replies.map((reply) => (
        <ForumPostCard
          key={reply.id}
          publicationId={reply.publicationId}
          contentUri={reply.contentUri}
          authorUsername={reply.authorUsername}
          authorAddress={reply.authorAddress}
          createdAt={reply.createdAt}
          upvotes={reply.upvotes}
          downvotes={reply.downvotes}
          position={reply.position}
        />
      ))}

      {/* Reply editor (if thread not locked) */}
      {!thread.isLocked && (
        <ThreadReplyEditor
          threadRootPublicationId={thread.rootPublicationId}
          threadFeed={thread.feed as FeedType}
        />
      )}
    </div>
  )
}

// Individual post card (used for both root and replies)
function ForumPostCard({
  publicationId,
  contentUri,
  authorUsername,
  authorAddress,
  createdAt,
  upvotes,
  downvotes,
  position,
  isRoot = false,
}: {
  publicationId: string
  contentUri: string | null
  authorUsername: string | null
  authorAddress: string
  createdAt: string
  upvotes: number
  downvotes: number
  position: number
  isRoot?: boolean
}) {
  return (
    <div className="border-b py-6 first:pt-0">
      {/* Post header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar placeholder — replace with fountain's UserAvatar */}
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div>
            <div className="text-sm font-medium">
              {authorUsername || authorAddress.slice(0, 10) + "..."}
            </div>
            <div className="text-xs text-muted-foreground">
              {isRoot ? "Original post" : `Reply #${position}`}
              {" · "}
              {formatRelativeTime(createdAt)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Link to standalone publication view */}
          <Link
            href={`/publication/${publicationId}`}
            className="text-muted-foreground hover:text-foreground"
            title="View as standalone article"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Post content — rendered via fountain's Plate.js in readOnly mode */}
      <div className="prose prose-sm max-w-none">
        <ForumPostContent contentUri={contentUri} publicationId={publicationId} />
      </div>

      {/* Post footer — voting */}
      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
        <button className="hover:text-foreground"><ArrowUp className="h-4 w-4" /></button>
        <span className="font-medium">{upvotes - downvotes}</span>
        <button className="hover:text-foreground"><ArrowDown className="h-4 w-4" /></button>
      </div>
    </div>
  )
}
```

### Content Renderer

This component fetches the Plate.js JSON from the publication metadata
and renders it using fountain's editor in read-only mode.

```tsx
// src/components/forum/forum-post-content.tsx

"use client"

import { useEffect, useState } from "react"
import { fetchPost } from "@lens-protocol/client/actions"
import { postId } from "@lens-protocol/client"
import { getLensClient } from "@/lib/lens/client"

// Reuse fountain's editor in readOnly mode
// This is the same component fountain uses to render articles
// import Editor from "@/components/editor/editor"

interface Props {
  contentUri: string | null
  publicationId: string
}

export function ForumPostContent({ contentUri, publicationId }: Props) {
  const [contentJson, setContentJson] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Fetch the Lens post to get metadata attributes
        const client = await getLensClient()
        const result = await fetchPost(client, {
          post: postId(publicationId),
        })

        if (result.isOk() && result.value?.__typename === "Post") {
          const attrs = result.value.metadata?.attributes || []
          const jsonAttr = attrs.find(
            (a: any) => "key" in a && a.key === "contentJson",
          )
          if (jsonAttr?.value) {
            setContentJson(jsonAttr.value)
          }
        }
      } catch (e) {
        console.error("Failed to load post content:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [publicationId])

  if (loading) {
    return <div className="animate-pulse h-24 bg-muted rounded" />
  }

  if (!contentJson) {
    return <div className="text-muted-foreground italic">Content unavailable</div>
  }

  // Render using fountain's Plate.js editor in readOnly mode
  // This is the exact same pattern fountain uses at line 10729:
  //   <Editor showToc value={contentJson} readOnly={true} />
  return (
    <div>
      {/* <Editor value={contentJson} readOnly={true} showToc={false} /> */}
      {/* Placeholder until fountain's Editor component is wired in */}
      <div className="whitespace-pre-wrap">{contentJson}</div>
    </div>
  )
}
```

Note: The `<Editor readOnly={true} value={contentJson} />` call is exactly
how fountain renders published articles. The `contentJson` attribute stores
the Plate.js JSON, and the editor renders it with all formatting intact
but no editing capabilities. This is the key integration point.

---

## Page 4: Standalone Publication View

Route: `/publication/:publicationId`

When someone clicks the external link icon on a reply, or arrives from
Hey.xyz / another Lens app, they see the reply as a standalone article
with a link back to the thread.

```tsx
// src/app/(app)/publication/[publicationId]/page.tsx

import { createClient } from "@/lib/db/client"
import { ForumPostContent } from "@/components/forum/forum-post-content"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

interface Props {
  params: { publicationId: string }
}

export default async function PublicationPage({ params }: Props) {
  const db = await createClient()

  // Check if it's a thread root
  const { data: thread } = await db
    .from("forum_threads")
    .select("root_publication_id, title, category")
    .eq("root_publication_id", params.publicationId)
    .single()

  if (thread) {
    // It's a root post — redirect to thread view
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-4 text-sm">
          <Link
            href={`/thread/${thread.root_publication_id}`}
            className="text-primary hover:underline"
          >
            ← View full thread: {thread.title}
          </Link>
        </div>
        <ForumPostContent
          contentUri={null}
          publicationId={params.publicationId}
        />
      </div>
    )
  }

  // Check if it's a reply
  const { data: reply } = await db
    .from("forum_thread_replies")
    .select("publication_id, thread_id")
    .eq("publication_id", params.publicationId)
    .single()

  if (reply) {
    const { data: parentThread } = await db
      .from("forum_threads")
      .select("root_publication_id, title")
      .eq("id", reply.thread_id)
      .single()

    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {parentThread && (
          <div className="mb-4 text-sm">
            <Link
              href={`/thread/${parentThread.root_publication_id}`}
              className="text-primary hover:underline"
            >
              ← Part of thread: {parentThread.title}
            </Link>
          </div>
        )}
        <ForumPostContent
          contentUri={null}
          publicationId={params.publicationId}
        />
      </div>
    )
  }

  return notFound()
}
```

---

## Content Loading Strategy

For the thread detail page, loading every reply's content from Lens API
individually would be slow. The strategy:

1. **Initial page load** — Supabase provides thread metadata + reply list
   instantly (server-side rendered)
2. **Content hydration** — Each `ForumPostContent` component fetches its
   Plate.js JSON from Lens client-side (parallel requests)
3. **Future optimization** — Cache `contentJson` in Supabase alongside
   `content_text` to eliminate Lens API calls entirely. Serve everything
   from Supabase, use Lens only as fallback.

The progressive approach: ship with Lens API fetching first (simpler),
add Supabase content caching in Part 9 (optimization).

---

## Checklist — Part 6 Complete When:

- [ ] Homepage shows all sections with categories, thread counts, activity
- [ ] Thread list page shows threads filtered by category
- [ ] Thread list has sorting (pinned first, then by last activity)
- [ ] Thread detail page shows root post + stacked replies
- [ ] Each post renders rich content via Plate.js readOnly mode
- [ ] Vote buttons visible (wiring to backend is Part 7)
- [ ] Reply editor visible at bottom of thread (from Part 5)
- [ ] Standalone publication page shows article with thread link
- [ ] Breadcrumb navigation works (Boards → Category → Thread)
- [ ] "New Thread" button links to editor
- [ ] View count increments on thread page load
- [ ] Empty states for categories with no threads

---

## Next: Part 7 — Forum Features (Port from Current Codebase)

With the display layer working, Part 7 wires up voting, moderation,
community management, and notifications — ported from the current
Web3Forum codebase.


# Part 7: Forum Features — Port from Current Codebase

## Goal

Port the interactive features from the current Web3Forum into the fountain
fork: voting, moderation, group membership management, notifications, and
profiles. These are adapted to work with the new forum schema (forum_threads,
forum_thread_replies, forum_votes) instead of the old tables.

---

## Prerequisites

- Part 6 complete (thread display working)
- Current Web3Forum codebase accessible for reference
- Lens React SDK hooks available (`useSessionClient`, etc.)

---

## Feature 1: Voting System

### What exists in current codebase
`hooks/common/use-voting.ts` — uses Lens reactions (`addReaction`, `undoReaction`)
with `PostReactionType` (upvote/downvote). Reads from `post.operations.hasUpvoted`
and `post.stats.upvotes`.

### What changes
We keep Lens reactions as the onchain source AND track votes in `forum_votes`
for fast display. The Supabase vote is the speed layer; the Lens reaction is
the permanent record.

### Port: useForumVote hook

```ts
// src/hooks/forum/use-forum-vote.ts

import { useCallback, useEffect, useState } from "react"
import {
  addReaction,
  undoReaction,
} from "@lens-protocol/client/actions"
import {
  PostReactionType,
  postId as toPostId,
  useSessionClient,
} from "@lens-protocol/react"
import { toast } from "sonner"

interface UseForumVoteArgs {
  publicationId: string
  initialUpvotes: number
  initialDownvotes: number
}

export function useForumVote({
  publicationId,
  initialUpvotes,
  initialDownvotes,
}: UseForumVoteArgs) {
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const sessionClient = useSessionClient()

  // Check user's existing vote from Supabase
  useEffect(() => {
    async function checkVote() {
      if (!sessionClient.data) return
      const user = await sessionClient.data.getAuthenticatedUser()
      if (user.isErr()) return

      const res = await fetch(
        `/api/forum/votes?publicationId=${publicationId}&account=${user.value.account}`,
      )
      if (res.ok) {
        const data = await res.json()
        setUserVote(data.direction || null)
      }
    }
    checkVote()
  }, [publicationId, sessionClient.data])

  const vote = useCallback(
    async (direction: 1 | -1) => {
      if (!sessionClient.data) {
        toast.error("Please log in to vote")
        return
      }
      setIsLoading(true)

      try {
        const pid = toPostId(publicationId)
        const reactionType =
          direction === 1 ? PostReactionType.Upvote : PostReactionType.Downvote

        if (userVote === direction) {
          // Toggle off
          await undoReaction(sessionClient.data, {
            post: pid,
            reaction: reactionType,
          })
          setUserVote(null)
          if (direction === 1) setUpvotes((v) => v - 1)
          else setDownvotes((v) => v - 1)
        } else {
          // Undo previous if exists
          if (userVote !== null) {
            const prevType =
              userVote === 1
                ? PostReactionType.Upvote
                : PostReactionType.Downvote
            await undoReaction(sessionClient.data, {
              post: pid,
              reaction: prevType,
            })
            if (userVote === 1) setUpvotes((v) => v - 1)
            else setDownvotes((v) => v - 1)
          }
          // Add new
          await addReaction(sessionClient.data, {
            post: pid,
            reaction: reactionType,
          })
          setUserVote(direction)
          if (direction === 1) setUpvotes((v) => v + 1)
          else setDownvotes((v) => v + 1)
        }

        // Sync to Supabase
        const user = await sessionClient.data.getAuthenticatedUser()
        if (user.isOk()) {
          await fetch("/api/forum/votes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              publicationId,
              account: user.value.account,
              direction: userVote === direction ? 0 : direction,
            }),
          })
        }
      } catch (e) {
        console.error("Vote failed:", e)
        toast.error("Vote failed")
      } finally {
        setIsLoading(false)
      }
    },
    [publicationId, userVote, sessionClient.data],
  )

  return {
    upvotes,
    downvotes,
    score: upvotes - downvotes,
    userVote,
    isLoading,
    upvote: () => vote(1),
    downvote: () => vote(-1),
  }
}
```

### API Route for Votes

```ts
// src/app/api/forum/votes/route.ts

import { createClient } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const pubId = req.nextUrl.searchParams.get("publicationId")
  const account = req.nextUrl.searchParams.get("account")
  if (!pubId || !account) return NextResponse.json({ direction: null })

  const db = await createClient()
  const { data } = await db
    .from("forum_votes")
    .select("direction")
    .eq("publication_id", pubId)
    .eq("account_address", account)
    .single()

  return NextResponse.json({ direction: data?.direction || null })
}

export async function POST(req: NextRequest) {
  const { publicationId, account, direction } = await req.json()
  const db = await createClient()

  if (direction === 0) {
    // Remove vote
    await db
      .from("forum_votes")
      .delete()
      .eq("publication_id", publicationId)
      .eq("account_address", account)
  } else {
    await db.rpc("forum_apply_vote", {
      p_publication_id: publicationId,
      p_account: account,
      p_direction: direction,
    })
  }

  return NextResponse.json({ success: true })
}
```

---

## Feature 2: Moderation Tools

### What exists in current codebase
- `hooks/replies/use-hide-reply.ts` — uses `hideReply` from Lens SDK
- `hooks/communities/use-community-remove-member.ts` — `removeGroupMembers` + `banGroupAccounts`
- `hooks/communities/use-community-unban-member.ts` — `unbanGroupAccounts`
- `hooks/communities/use-add-moderator.ts` — `addAdmins` on the group
- `hooks/communities/use-remove-moderator.ts` — `removeAdmins`
- `hooks/communities/use-is-moderator.ts` — checks if user is group admin
- `components/thread/thread-reply-moderator-actions.tsx` — UI for mod actions

### Port strategy
These hooks use Lens SDK directly and are mostly group-address-agnostic.
Port them with minimal changes — just update the group address references
to use the new constants (COMMONS_GROUP_ADDRESS, RESEARCH_GROUP_ADDRESS).

### Key hooks to port (adapt, don't rewrite)

```ts
// src/hooks/forum/use-is-moderator.ts
// Adapted from hooks/communities/use-is-moderator.ts

import { useEffect, useState } from "react"
import { fetchAdminsFor } from "@lens-protocol/client/actions"
import { evmAddress } from "@lens-protocol/client"
import { useSessionClient } from "@lens-protocol/react"
import { COMMONS_GROUP_ADDRESS, RESEARCH_GROUP_ADDRESS } from "@/lib/forum/constants"

export function useIsModerator() {
  const [isModerator, setIsModerator] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const sessionClient = useSessionClient()

  useEffect(() => {
    async function check() {
      if (!sessionClient.data) {
        setIsModerator(false)
        setIsLoading(false)
        return
      }

      const user = await sessionClient.data.getAuthenticatedUser()
      if (user.isErr()) {
        setIsModerator(false)
        setIsLoading(false)
        return
      }

      // Check if admin of either group
      for (const groupAddr of [COMMONS_GROUP_ADDRESS, RESEARCH_GROUP_ADDRESS]) {
        const result = await fetchAdminsFor(sessionClient.data, {
          address: evmAddress(groupAddr),
        })
        if (result.isOk()) {
          const isAdmin = result.value.items.some(
            (a) => a.account.address === user.value.account,
          )
          if (isAdmin) {
            setIsModerator(true)
            setIsLoading(false)
            return
          }
        }
      }

      setIsModerator(false)
      setIsLoading(false)
    }
    check()
  }, [sessionClient.data])

  return { isModerator, isLoading }
}
```

```ts
// src/hooks/forum/use-hide-reply.ts
// Adapted from hooks/replies/use-hide-reply.ts

import { useCallback, useState } from "react"
import { hideReply } from "@lens-protocol/client/actions"
import { postId, useSessionClient } from "@lens-protocol/react"
import { toast } from "sonner"

export function useHideReply() {
  const [isLoading, setIsLoading] = useState(false)
  const sessionClient = useSessionClient()

  const hide = useCallback(
    async (publicationId: string) => {
      if (!sessionClient.data) {
        toast.error("Not logged in")
        return false
      }

      setIsLoading(true)
      try {
        const result = await hideReply(sessionClient.data, {
          post: postId(publicationId),
        })

        if (result.isErr()) {
          toast.error("Failed to hide reply")
          return false
        }

        // Also mark hidden in Supabase
        await fetch(`/api/forum/replies/${publicationId}/hide`, {
          method: "POST",
        })

        toast.success("Reply hidden")
        return true
      } catch {
        toast.error("Failed to hide reply")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [sessionClient.data],
  )

  return { hide, isLoading }
}
```

### Moderation actions API

```ts
// src/app/api/forum/replies/[publicationId]/hide/route.ts

import { createClient } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  req: NextRequest,
  { params }: { params: { publicationId: string } },
) {
  const db = await createClient()

  await db
    .from("forum_thread_replies")
    .update({ is_hidden: true })
    .eq("publication_id", params.publicationId)

  return NextResponse.json({ success: true })
}
```

---

## Feature 3: Group Membership Management

### What exists in current codebase
- `hooks/communities/use-join-community.ts` — `joinGroup`
- `hooks/communities/use-leave-community.ts` — `leaveGroup`
- `hooks/communities/use-request-join-community.ts` — `joinGroup` (with approval)
- `hooks/communities/use-community-membership-management.ts` — approve/deny requests
- `hooks/communities/use-community-members.ts` — list members
- `hooks/communities/use-community-banned-members.ts` — list banned

### Port strategy
These are pure Lens SDK operations. Port directly, parameterize by group
address. The main change: instead of one community group, we have two
main groups (Commons + Research) plus optional community groups.

```ts
// src/hooks/forum/use-join-group.ts

import { useCallback, useState } from "react"
import { joinGroup } from "@lens-protocol/client/actions"
import { evmAddress, useSessionClient } from "@lens-protocol/react"
import { handleOperationWith } from "@lens-protocol/client/viem"
import { useWalletClient } from "wagmi"
import { toast } from "sonner"

export function useJoinGroup() {
  const [isLoading, setIsLoading] = useState(false)
  const sessionClient = useSessionClient()
  const { data: walletClient } = useWalletClient()

  const join = useCallback(
    async (groupAddress: string) => {
      if (!sessionClient.data || !walletClient) {
        toast.error("Please log in and connect wallet")
        return false
      }

      setIsLoading(true)
      const pending = toast.loading("Requesting to join...")

      try {
        const result = await joinGroup(sessionClient.data, {
          group: evmAddress(groupAddress),
        })
          .andThen(handleOperationWith(walletClient))
          .andThen(sessionClient.data.waitForTransaction)

        toast.dismiss(pending)

        if (result.isErr()) {
          toast.error("Failed to join")
          return false
        }

        toast.success("Join request sent! Waiting for approval.")
        return true
      } catch {
        toast.dismiss(pending)
        toast.error("Failed to join")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [sessionClient.data, walletClient],
  )

  return { join, isLoading }
}
```

The approve/deny/ban/unban hooks follow the same pattern — direct ports
from the current codebase with the group address parameterized.

---

## Feature 4: Notifications

### What exists in current codebase
- `hooks/notifications/use-notifications.ts` — `fetchNotifications` from Lens
- `components/notifications/` — various notification item renderers

### Port strategy
Lens notifications work at the protocol level — they're not tied to our
app's data model. Port the hook and components directly. The only change:
filter notifications to our app's feeds.

```ts
// src/hooks/forum/use-notifications.ts

import { useEffect, useState } from "react"
import { fetchNotifications } from "@lens-protocol/client/actions"
import { evmAddress, type Notification, useSessionClient } from "@lens-protocol/react"
import { COMMONS_FEED_ADDRESS, RESEARCH_FEED_ADDRESS } from "@/lib/forum/constants"

export function useForumNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const sessionClient = useSessionClient()

  useEffect(() => {
    async function load() {
      if (!sessionClient.data) return

      const result = await fetchNotifications(sessionClient.data, {
        filter: {
          feeds: [
            { feed: evmAddress(COMMONS_FEED_ADDRESS) },
            { feed: evmAddress(RESEARCH_FEED_ADDRESS) },
          ],
        },
      })

      if (result.isOk()) {
        setNotifications([...result.value.items])
      }
      setLoading(false)
    }
    load()
  }, [sessionClient.data])

  return { notifications, loading }
}
```

Notification renderer components (`mention-notification-item.tsx`,
`reaction-notification-item.tsx`, `reply-notification-item.tsx`) port
directly — they render Lens Notification objects which haven't changed.

---

## Feature 5: Profile Pages

### What exists in current codebase
- `hooks/account/use-profile-account.ts` — fetch account + stats
- `components/profile/profile-header.tsx` — cover image, avatar, bio
- `components/profile/profile-stats.tsx` — followers, following, posts
- `components/profile/profile-recent-activity.tsx` — recent posts
- `components/profile/profile-joined-communities.tsx` — groups

### Port strategy
Profile pages are Lens-native — they show account data, not forum-specific
data. Port directly. Add a "Forum Activity" tab that queries `forum_threads`
and `forum_thread_replies` by `author_address`.

```ts
// src/lib/forum/get-user-forum-activity.ts

import { createClient } from "@/lib/db/client"

export async function getUserForumActivity(authorAddress: string) {
  const db = await createClient()

  const { data: threads } = await db
    .from("forum_threads")
    .select("root_publication_id, title, category, reply_count, created_at")
    .eq("author_address", authorAddress)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20)

  const { data: replies } = await db
    .from("forum_thread_replies")
    .select(`
      publication_id,
      position,
      created_at,
      thread_id,
      forum_threads!inner(root_publication_id, title)
    `)
    .eq("author_address", authorAddress)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20)

  return { threads: threads || [], replies: replies || [] }
}
```

---

## Feature 6: Authorization Endpoint — Membership Check

In Part 1, the auth endpoint returns `allowed: true` for everyone.
Now we can tighten it to check group membership.

Update `src/authorize.ts` in the auth server:

```ts
// In the auth server (society-forum-auth)
// Updated authorize.ts with membership check

import express from "express"
import { PRIVATE_KEY } from "./config"
import { PublicClient, mainnet, evmAddress } from "@lens-protocol/client"
import { fetchGroupMembers } from "@lens-protocol/client/actions"

const COMMONS_GROUP = "0x..."  // from Part 2
const client = PublicClient.create({ environment: mainnet })

const router = express.Router()

router.post("/", async function (req, res) {
  if (req.body.test === true) return res.sendStatus(200)

  const { account, signedBy } = req.body
  if (!account || !signedBy) {
    return res.status(400).json({ error: "Missing fields" })
  }

  // Check if account is a member of the Commons group
  // (Members of Commons can access the forum)
  const members = await fetchGroupMembers(client, {
    group: evmAddress(COMMONS_GROUP),
    filter: { member: evmAddress(account) },
  })

  const isMember = members.isOk() && members.value.items.length > 0

  if (!isMember) {
    return res.json({
      allowed: false,
      reason: "You must be a member of the Society Protocol community to access this forum.",
    })
  }

  res.json({
    allowed: true,
    sponsored: true,
    signingKey: PRIVATE_KEY,
  })
})

export default router
```

Note: This is optional and can be enabled later. Start with `allowed: true`
for everyone during development, then enable membership checks when ready.

---

## Port Checklist — Files to Copy/Adapt

From `hooks/common/`:
- [x] `use-voting.ts` → `hooks/forum/use-forum-vote.ts` (adapted)

From `hooks/communities/`:
- [x] `use-is-moderator.ts` → `hooks/forum/use-is-moderator.ts` (adapted)
- [x] `use-join-community.ts` → `hooks/forum/use-join-group.ts` (adapted)
- [ ] `use-leave-community.ts` → `hooks/forum/use-leave-group.ts` (direct port)
- [ ] `use-community-membership-management.ts` → `hooks/forum/use-membership-management.ts` (adapt)
- [ ] `use-community-members.ts` → `hooks/forum/use-group-members.ts` (direct port)
- [ ] `use-community-banned-members.ts` → `hooks/forum/use-banned-members.ts` (direct port)
- [ ] `use-community-remove-member.ts` → `hooks/forum/use-remove-member.ts` (direct port)
- [ ] `use-community-unban-member.ts` → `hooks/forum/use-unban-member.ts` (direct port)
- [ ] `use-add-moderator.ts` → `hooks/forum/use-add-moderator.ts` (direct port)
- [ ] `use-remove-moderator.ts` → `hooks/forum/use-remove-moderator.ts` (direct port)

From `hooks/replies/`:
- [x] `use-hide-reply.ts` → `hooks/forum/use-hide-reply.ts` (adapted)

From `hooks/notifications/`:
- [x] `use-notifications.ts` → `hooks/forum/use-notifications.ts` (adapted)

From `hooks/account/`:
- [ ] `use-profile-account.ts` → direct port (Lens-native, no changes)

From `components/notifications/`:
- [ ] All notification item components → direct port

From `components/profile/`:
- [ ] All profile components → direct port + add forum activity tab

---

## Checklist — Part 7 Complete When:

- [ ] Voting works on threads and replies (Lens reactions + Supabase sync)
- [ ] Moderators can hide replies (Lens hideReply + Supabase is_hidden)
- [ ] Moderator check works for both groups
- [ ] Users can request to join groups
- [ ] Admins can approve/deny membership requests
- [ ] Admins can remove/ban members
- [ ] Notifications show forum-specific activity
- [ ] Profile pages show user info + forum activity
- [ ] Auth endpoint optionally checks group membership

---

## Next: Part 8 — Navigation & Layout

With all features working, Part 8 builds the app shell: homepage layout,
navbar with auth state, category navigation, search, and mobile responsiveness.


# Part 8: Navigation & Layout

## Goal

Build the app shell that wraps all forum pages: header with auth state and
navigation, homepage layout with board sections, category sidebar, search,
and mobile responsiveness. This adapts fountain.ink's existing navigation
components and adds forum-specific navigation.

---

## Prerequisites

- Part 6 complete (all pages exist)
- Part 7 complete (auth, notifications working)
- Fountain's Header, UserMenu, and auth components available

---

## App Structure

```
/                        → Redirect to /boards
/boards                  → Homepage (board sections)
/boards/:feed            → Thread list (filtered by category)
/thread/:pubId           → Thread detail
/publication/:pubId      → Standalone article
/editor/new              → New thread (Plate.js editor)
/notifications           → Notification list
/u/:username             → Profile page
/settings                → User settings (from fountain)
/search                  → Search results
```

---

## Step 1: Forum Header

Adapt fountain's `Header` component. Replace blog-specific items (blog
subscribe, draft create) with forum-specific items (boards link, new thread).

```tsx
// src/components/forum/forum-header.tsx

"use client"

import { MeResult } from "@lens-protocol/client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { NotificationButton } from "@/components/notifications/notification-button"
import { UserMenu } from "@/components/user/user-menu"
import { HeaderSearch } from "@/components/navigation/header-search"
import { Button } from "@/components/ui/button"
import { PenSquare, Home, Bell } from "lucide-react"

export function ForumHeader({ session }: { session: MeResult | null }) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const isAuthenticated = session !== null
  const isWritePage = pathname.startsWith("/editor")

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-background/70 backdrop-blur-xl border-b">
      <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-4">
          <Link href="/boards" className="font-bold text-lg tracking-tight">
            SOCIETY PROTOCOL
          </Link>

          {!isMobile && !isWritePage && (
            <nav className="flex items-center gap-1 ml-4">
              <NavLink href="/boards" current={pathname}>
                Boards
              </NavLink>
              <NavLink href="/search" current={pathname}>
                Search
              </NavLink>
            </nav>
          )}
        </div>

        {/* Center: Search (desktop only, non-write pages) */}
        {!isWritePage && !isMobile && (
          <div className="flex-1 max-w-md mx-4">
            <HeaderSearch />
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated && !isWritePage && (
            <Link href="/editor/new">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <PenSquare className="h-4 w-4" />
                {!isMobile && "New Thread"}
              </Button>
            </Link>
          )}
          {isAuthenticated && <NotificationButton />}
          <UserMenu session={session} showDropdown />
        </div>
      </div>
    </header>
  )
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string
  current: string
  children: React.ReactNode
}) {
  const isActive = current.startsWith(href)
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
        isActive
          ? "bg-muted font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </Link>
  )
}
```

---

## Step 2: Mobile Bottom Navigation

For mobile, add a bottom tab bar (common forum pattern).

```tsx
// src/components/forum/forum-mobile-nav.tsx

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, PenSquare, Bell, User } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export function ForumMobileNav() {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  if (!isMobile) return null

  // Hide on editor pages
  if (pathname.startsWith("/editor")) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t h-14 flex items-center justify-around px-2">
      <MobileTab href="/boards" icon={Home} label="Boards" current={pathname} />
      <MobileTab href="/search" icon={Search} label="Search" current={pathname} />
      <MobileTab href="/editor/new" icon={PenSquare} label="Post" current={pathname} />
      <MobileTab href="/notifications" icon={Bell} label="Alerts" current={pathname} />
      <MobileTab href="/settings" icon={User} label="Profile" current={pathname} />
    </nav>
  )
}

function MobileTab({
  href,
  icon: Icon,
  label,
  current,
}: {
  href: string
  icon: any
  label: string
  current: string
}) {
  const isActive = current.startsWith(href)
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  )
}
```

---

## Step 3: Root Layout

Wire the header and mobile nav into the app layout. Fountain uses a
`(app)` route group for authenticated pages.

```tsx
// src/app/(app)/layout.tsx (modify existing)

import { ForumHeader } from "@/components/forum/forum-header"
import { ForumMobileNav } from "@/components/forum/forum-mobile-nav"
import { getSession } from "@/lib/auth/get-session" // fountain's auth

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <div className="min-h-screen flex flex-col">
      <ForumHeader session={session} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <ForumMobileNav />
    </div>
  )
}
```

---

## Step 4: Homepage with Board Sections

The homepage from Part 6 (`/boards/page.tsx`) already renders sections.
Add a sidebar with quick links and community info.

```tsx
// src/app/(app)/boards/page.tsx (enhanced from Part 6)

import { getBoardSections } from "@/lib/forum/get-board-sections"
import { BoardSectionList } from "@/components/forum/board-section-list"

export const dynamic = "force-dynamic"

export default async function BoardsPage() {
  const sections = await getBoardSections()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {sections.map((section) => (
            <BoardSectionList key={section.id} section={section} />
          ))}
        </div>

        {/* Sidebar (desktop only) */}
        <aside className="hidden lg:block w-72 shrink-0">
          <ForumSidebar />
        </aside>
      </div>
    </div>
  )
}

function ForumSidebar() {
  return (
    <div className="sticky top-20 space-y-6">
      {/* Community info */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold text-sm mb-2">Society Protocol</h3>
        <p className="text-xs text-muted-foreground">
          A close community for discussing governance, research,
          and the future of decentralized societies.
        </p>
      </div>

      {/* Quick links */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold text-sm mb-2">Quick Links</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <a href="/boards/commons?category=beginners" className="text-muted-foreground hover:text-foreground">
              Beginners & Help
            </a>
          </li>
          <li>
            <a href="/boards/commons?category=announcements" className="text-muted-foreground hover:text-foreground">
              Announcements
            </a>
          </li>
          <li>
            <a href="/boards/research?category=architecture" className="text-muted-foreground hover:text-foreground">
              Architecture
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
```

---

## Step 5: Search Page

Forum search queries the `forum_threads` full-text search index.

```tsx
// src/app/(app)/search/page.tsx

import { createClient } from "@/lib/db/client"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: { q?: string }
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim()

  let results: any[] = []
  if (query) {
    const db = await createClient()
    const { data } = await db
      .from("forum_threads")
      .select(
        "root_publication_id, title, summary, category, author_username, created_at",
      )
      .eq("is_hidden", false)
      .textSearch(
        "title_content_search",
        query,
        { type: "websearch" },
      )
      .order("created_at", { ascending: false })
      .limit(30)

    results = data || []
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold mb-4">Search</h1>

      {/* Search form */}
      <form method="GET" className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search threads..."
          className="w-full px-4 py-2 border rounded-lg bg-background"
          autoFocus
        />
      </form>

      {/* Results */}
      {query && (
        <div className="text-sm text-muted-foreground mb-4">
          {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
        </div>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Link
            key={r.root_publication_id}
            href={`/thread/${r.root_publication_id}`}
            className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="font-medium text-sm">{r.title}</div>
            {r.summary && (
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {r.summary}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              {r.author_username} · {r.category} · {formatRelativeTime(r.created_at)}
            </div>
          </Link>
        ))}
      </div>

      {query && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No threads found matching your search.
        </div>
      )}
    </div>
  )
}
```

Note: The `textSearch` call uses the GIN index created in Part 3:
```sql
CREATE INDEX idx_forum_threads_search ON forum_threads
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_text,'')));
```

For this to work with Supabase's `.textSearch()`, you may need to create
a generated column or use `.rpc()` with a custom function. Alternative:

```ts
// Using raw SQL via rpc
const { data } = await db.rpc("forum_search_threads", {
  search_query: query,
  result_limit: 30,
})
```

With the SQL function:
```sql
CREATE OR REPLACE FUNCTION forum_search_threads(search_query TEXT, result_limit INT DEFAULT 30)
RETURNS SETOF forum_threads AS $$
  SELECT * FROM forum_threads
  WHERE is_hidden = FALSE
    AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_text,''))
        @@ websearch_to_tsquery('english', search_query)
  ORDER BY created_at DESC
  LIMIT result_limit;
$$ LANGUAGE sql STABLE;
```

---

## Step 6: Notifications Page

Port the notifications page from the current codebase. Uses the
`useForumNotifications` hook from Part 7.

```tsx
// src/app/(app)/notifications/page.tsx

"use client"

import { useForumNotifications } from "@/hooks/forum/use-notifications"

// Port notification item components from current codebase:
// - MentionNotificationItem
// - ReactionNotificationItem
// - ReplyNotificationItem

export default function NotificationsPage() {
  const { notifications, loading } = useForumNotifications()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Notifications</h1>

      {loading && <div className="text-muted-foreground">Loading...</div>}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No notifications yet.
        </div>
      )}

      <div className="space-y-1">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
    </div>
  )
}

// Simplified notification renderer
// Replace with ported components from current codebase for full fidelity
function NotificationItem({ notification }: { notification: any }) {
  return (
    <div className="border rounded-lg p-3 text-sm">
      <pre className="text-xs text-muted-foreground">
        {notification.__typename}
      </pre>
    </div>
  )
}
```

---

## Step 7: Profile Page

Port from current codebase. Fountain already has user pages — merge
the forum activity tab into their structure.

```tsx
// src/app/(app)/u/[username]/page.tsx

import { getUserForumActivity } from "@/lib/forum/get-user-forum-activity"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"

// Port ProfileHeader, ProfileStats from current codebase
// Fountain also has user components — merge as appropriate

interface Props {
  params: { username: string }
}

export default async function ProfilePage({ params }: Props) {
  // Fetch Lens account data (port from use-profile-account.ts)
  // Fetch forum activity
  const activity = await getUserForumActivity(params.username)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Profile header — port from current codebase */}
      <h1 className="text-xl font-bold mb-6">@{params.username}</h1>

      {/* Forum activity */}
      <h2 className="font-bold text-sm mb-3">Forum Activity</h2>

      {activity.threads.length === 0 && activity.replies.length === 0 && (
        <div className="text-muted-foreground text-sm">No forum activity yet.</div>
      )}

      <div className="space-y-2">
        {activity.threads.map((t: any) => (
          <Link
            key={t.root_publication_id}
            href={`/thread/${t.root_publication_id}`}
            className="block border rounded p-3 hover:bg-muted/50 text-sm"
          >
            <span className="font-medium">{t.title}</span>
            <span className="text-muted-foreground ml-2">
              {t.reply_count} replies · {formatRelativeTime(t.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

## Responsive Design Notes

- Header: full nav on desktop, logo + hamburger on mobile
- Mobile bottom nav: 5 tabs (Boards, Search, Post, Alerts, Profile)
- Board sections: full width on mobile, sidebar hidden
- Thread list: compact rows on mobile (hide view count, shorten timestamps)
- Thread detail: full width, reply editor stacks below
- Editor: fountain's Plate.js is already responsive
- `pb-16 md:pb-0` on main content to account for mobile bottom nav

---

## Checklist — Part 8 Complete When:

- [ ] Forum header shows logo, nav links, search, auth state
- [ ] Mobile bottom navigation works on small screens
- [ ] Homepage shows board sections with sidebar
- [ ] Search page returns results from full-text index
- [ ] Notifications page shows forum-filtered notifications
- [ ] Profile page shows user info + forum activity
- [ ] All pages are responsive (mobile + desktop)
- [ ] Navigation between pages works (breadcrumbs, links)
- [ ] "New Thread" button visible when authenticated
- [ ] Editor page accessible from nav

---

## Next: Part 9 — Recovery & Sync

With the full app working, Part 9 adds the safety net: background sync
between Supabase and Lens, recovery scripts to rebuild from onchain data,
and content cache optimization.

# Part 9: Recovery & Sync

## Goal

Build the safety net: a full recovery script that reconstructs all forum
data from Lens Protocol if Supabase is lost, a background sync job that
keeps Supabase in sync with onchain state, and content cache optimization
that eliminates Lens API calls for thread rendering.

---

## Prerequisites

- Parts 1–8 complete (full forum working)
- Lens feeds populated with threads and replies
- Supabase schema from Part 3

---

## Why This Matters

Supabase is the speed layer. Lens + Grove is the source of truth.

If Supabase is wiped, corrupted, or you migrate to a new database:

- All thread structure lives onchain (`commentOn` relationships)
- All content lives on Grove (`contentUri`)
- All categories are encoded in metadata attributes (`forumCategory`)
- All reply-to-thread mappings are in metadata (`forumThreadId`)
- Timestamps provide ordering

Recovery = read onchain data → rebuild Supabase tables.

---

## Script 1: Full Recovery (Rebuild from Scratch)

Run this if Supabase is empty or corrupted. It reconstructs everything.

```ts
// scripts/recover-forum.ts
import { PostReferenceType, PublicClient, evmAddress, mainnet } from "@lens-protocol/client";
import { fetchPostReferences, fetchPosts } from "@lens-protocol/client/actions";
import { createClient } from "@supabase/supabase-js";

// Config
const COMMONS_FEED = "0x..."; // from Part 2
const RESEARCH_FEED = "0x..."; // from Part 2
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const lens = PublicClient.create({ environment: mainnet });
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RecoveredThread {
  rootPublicationId: string;
  contentUri: string | null;
  feed: string;
  category: string;
  title: string;
  summary: string;
  contentText: string;
  authorAddress: string;
  authorUsername: string | null;
  createdAt: string;
  replies: RecoveredReply[];
}

interface RecoveredReply {
  publicationId: string;
  contentUri: string | null;
  authorAddress: string;
  authorUsername: string | null;
  contentText: string;
  summary: string;
  createdAt: string;
}

async function recoverFeed(feedAddress: string, feedName: string): Promise<RecoveredThread[]> {
  console.log(`\nRecovering feed: ${feedName} (${feedAddress})`);
  const threads: RecoveredThread[] = [];

  // Paginate through all posts on this feed
  let cursor: string | undefined;
  let page = 0;

  while (true) {
    page++;
    console.log(`  Fetching page ${page}...`);

    const result = await fetchPosts(lens, {
      filter: {
        feeds: [{ feed: evmAddress(feedAddress) }],
      },
      ...(cursor ? { cursor } : {}),
    });

    if (result.isErr()) {
      console.error("  Error fetching posts:", result.error);
      break;
    }

    const { items, pageInfo } = result.value;

    for (const post of items) {
      if (post.__typename !== "Post") continue;

      // Only process root posts (no commentOn = thread root)
      if (post.commentOn) continue;

      const thread = await recoverThread(post, feedName);
      if (thread) threads.push(thread);
    }

    if (!pageInfo.next) break;
    cursor = pageInfo.next;
  }

  console.log(`  Found ${threads.length} threads in ${feedName}`);
  return threads;
}

async function recoverThread(post: any, feedName: string): Promise<RecoveredThread | null> {
  const metadata = post.metadata;
  if (!metadata || metadata.__typename !== "ArticleMetadata") return null;

  // Extract category from metadata attributes
  const attrs = metadata.attributes || [];
  const categoryAttr = attrs.find((a: any) => "key" in a && a.key === "forumCategory");
  const category = categoryAttr?.value || "off-topic";

  // Extract content
  const title = metadata.title || "Untitled";
  const content = metadata.content || "";
  const contentUri = post.contentUri || null;

  console.log(`    Thread: "${title}" (${post.id})`);

  // Fetch all replies via commentOn references
  const replies: RecoveredReply[] = [];
  let replyCursor: string | undefined;

  while (true) {
    const refsResult = await fetchPostReferences(lens, {
      referencedPost: post.id,
      referenceTypes: [PostReferenceType.CommentOn],
      ...(replyCursor ? { cursor: replyCursor } : {}),
    });

    if (refsResult.isErr()) break;

    const { items: refItems, pageInfo: refPageInfo } = refsResult.value;

    for (const ref of refItems) {
      if (ref.__typename !== "Post") continue;

      const refContent = ref.metadata?.content || "";
      replies.push({
        publicationId: ref.id,
        contentUri: ref.contentUri || null,
        authorAddress: ref.author.address,
        authorUsername: ref.author.username?.localName || null,
        contentText: refContent,
        summary: refContent.slice(0, 200),
        createdAt: ref.timestamp,
      });
    }

    if (!refPageInfo.next) break;
    replyCursor = refPageInfo.next;
  }

  // Sort replies by timestamp (onchain ordering)
  replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  console.log(`      ${replies.length} replies`);

  return {
    rootPublicationId: post.id,
    contentUri,
    feed: feedName,
    category,
    title,
    summary: content.slice(0, 200),
    contentText: content,
    authorAddress: post.author.address,
    authorUsername: post.author.username?.localName || null,
    createdAt: post.timestamp,
    replies,
  };
}

async function writeToSupabase(threads: RecoveredThread[]) {
  console.log(`\nWriting ${threads.length} threads to Supabase...`);

  for (const thread of threads) {
    // Insert thread
    const { data: threadRow, error: threadErr } = await db
      .from("forum_threads")
      .upsert(
        {
          root_publication_id: thread.rootPublicationId,
          content_uri: thread.contentUri,
          feed: thread.feed,
          category: thread.category,
          title: thread.title,
          summary: thread.summary,
          content_text: thread.contentText,
          author_address: thread.authorAddress,
          author_username: thread.authorUsername,
          reply_count: thread.replies.length,
          last_reply_at: thread.replies.length > 0 ? thread.replies[thread.replies.length - 1].createdAt : null,
          created_at: thread.createdAt,
        },
        { onConflict: "root_publication_id" },
      )
      .select("id")
      .single();

    if (threadErr) {
      console.error(`  Error inserting thread ${thread.rootPublicationId}:`, threadErr);
      continue;
    }

    // Insert replies
    for (let i = 0; i < thread.replies.length; i++) {
      const reply = thread.replies[i];
      await db.from("forum_thread_replies").upsert(
        {
          thread_id: threadRow.id,
          publication_id: reply.publicationId,
          content_uri: reply.contentUri,
          position: i + 1,
          content_text: reply.contentText,
          summary: reply.summary,
          author_address: reply.authorAddress,
          author_username: reply.authorUsername,
          created_at: reply.createdAt,
        },
        { onConflict: "publication_id" },
      );
    }
  }

  // Recount category thread counts
  console.log("Recounting category thread counts...");
  const { data: counts } = await db.from("forum_threads").select("category").eq("is_hidden", false);

  const countMap = new Map<string, number>();
  for (const row of counts || []) {
    countMap.set(row.category, (countMap.get(row.category) || 0) + 1);
  }

  for (const [slug, count] of countMap) {
    await db.from("forum_categories").update({ thread_count: count }).eq("slug", slug);
  }

  console.log("Done!");
}

async function main() {
  console.log("=== FORUM RECOVERY ===");
  console.log("Rebuilding Supabase from Lens Protocol...\n");

  const commonsThreads = await recoverFeed(COMMONS_FEED, "commons");
  const researchThreads = await recoverFeed(RESEARCH_FEED, "research");

  const allThreads = [...commonsThreads, ...researchThreads];
  await writeToSupabase(allThreads);

  console.log(`\n=== RECOVERY COMPLETE ===`);
  console.log(`Threads recovered: ${allThreads.length}`);
  console.log(`Replies recovered: ${allThreads.reduce((sum, t) => sum + t.replies.length, 0)}`);
}

main();
```

Run with:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/recover-forum.ts
```

---

## Script 2: Incremental Sync (Background Job)

Runs periodically (e.g., every 5 minutes via cron or Supabase Edge Function)
to catch any posts that were published but not tracked in Supabase (e.g.,
due to a failed API call, or posts made via another Lens client).

```ts
// scripts/sync-forum.ts (or src/app/api/forum/sync/route.ts as a cron endpoint)
import { PostReferenceType, PublicClient, evmAddress, mainnet } from "@lens-protocol/client";
import { fetchPostReferences, fetchPosts } from "@lens-protocol/client/actions";
import { createClient } from "@supabase/supabase-js";

const COMMONS_FEED = "0x...";
const RESEARCH_FEED = "0x...";

const lens = PublicClient.create({ environment: mainnet });
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function syncFeed(feedAddress: string, feedName: string) {
  // Fetch recent posts (last 100)
  const result = await fetchPosts(lens, {
    filter: {
      feeds: [{ feed: evmAddress(feedAddress) }],
    },
  });

  if (result.isErr()) {
    console.error(`Sync error for ${feedName}:`, result.error);
    return;
  }

  for (const post of result.value.items) {
    if (post.__typename !== "Post") continue;

    if (!post.commentOn) {
      // Root post — check if thread exists in Supabase
      const { data: existing } = await db
        .from("forum_threads")
        .select("id")
        .eq("root_publication_id", post.id)
        .single();

      if (!existing) {
        console.log(`New thread found: ${post.id}`);
        await insertMissingThread(post, feedName);
      }
    } else {
      // Reply — check if tracked
      const { data: existing } = await db
        .from("forum_thread_replies")
        .select("id")
        .eq("publication_id", post.id)
        .single();

      if (!existing) {
        console.log(`New reply found: ${post.id}`);
        await insertMissingReply(post);
      }
    }
  }
}

async function insertMissingThread(post: any, feedName: string) {
  const metadata = post.metadata;
  if (!metadata || metadata.__typename !== "ArticleMetadata") return;

  const attrs = metadata.attributes || [];
  const categoryAttr = attrs.find((a: any) => "key" in a && a.key === "forumCategory");
  const category = categoryAttr?.value || "off-topic";

  await db.from("forum_threads").insert({
    root_publication_id: post.id,
    content_uri: post.contentUri || null,
    feed: feedName,
    category,
    title: metadata.title || "Untitled",
    summary: (metadata.content || "").slice(0, 200),
    content_text: metadata.content || "",
    author_address: post.author.address,
    author_username: post.author.username?.localName || null,
    created_at: post.timestamp,
  });

  await db.rpc("forum_add_thread_to_category", { p_slug: category });
}

async function insertMissingReply(post: any) {
  // Find parent thread
  const rootId = post.commentOn?.id || post.root?.id;
  if (!rootId) return;

  const { data: thread } = await db
    .from("forum_threads")
    .select("id, reply_count")
    .eq("root_publication_id", rootId)
    .single();

  if (!thread) return;

  const position = thread.reply_count + 1;
  const content = post.metadata?.content || "";

  await db.from("forum_thread_replies").insert({
    thread_id: thread.id,
    publication_id: post.id,
    content_uri: post.contentUri || null,
    position,
    content_text: content,
    summary: content.slice(0, 200),
    author_address: post.author.address,
    author_username: post.author.username?.localName || null,
    created_at: post.timestamp,
  });

  await db.rpc("forum_add_reply", {
    p_thread_id: thread.id,
    p_reply_time: post.timestamp,
  });
}

async function main() {
  console.log("Syncing forum data...");
  await syncFeed(COMMONS_FEED, "commons");
  await syncFeed(RESEARCH_FEED, "research");
  console.log("Sync complete");
}

main();
```

### Deployment Options for Sync

**Option A: Cron job** — Run `scripts/sync-forum.ts` every 5 minutes via
system cron, GitHub Actions scheduled workflow, or Railway cron.

**Option B: API route + Vercel Cron**

```ts
// src/app/api/forum/sync/route.ts
export async function GET() {
  // Run sync logic
  // Vercel cron calls this endpoint on schedule
  return Response.json({ synced: true });
}
```

In `vercel.json`:

```json
{ "crons": [{ "path": "/api/forum/sync", "schedule": "*/5 * * * *" }] }
```

**Option C: Supabase Edge Function** — Deploy as a Deno function triggered
by Supabase's built-in cron scheduler.

---

## Script 3: Content Cache Optimization

Part 6 fetches `contentJson` from Lens API for each post on the thread
detail page. This is slow for threads with many replies. The optimization:
cache `contentJson` in Supabase so thread pages load entirely from the DB.

### Add content_json column

```sql
-- Migration: add content JSON cache
ALTER TABLE forum_threads ADD COLUMN content_json JSONB;
ALTER TABLE forum_thread_replies ADD COLUMN content_json JSONB;
```

### Cache population script

```ts
// scripts/cache-content.ts
import { PublicClient, mainnet, postId } from "@lens-protocol/client";
import { fetchPost } from "@lens-protocol/client/actions";
import { createClient } from "@supabase/supabase-js";

const lens = PublicClient.create({ environment: mainnet });
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function cacheContentForPublication(table: string, idColumn: string, pubId: string) {
  const result = await fetchPost(lens, { post: postId(pubId) });
  if (result.isErr() || result.value?.__typename !== "Post") return;

  const attrs = result.value.metadata?.attributes || [];
  const jsonAttr = attrs.find((a: any) => "key" in a && a.key === "contentJson");
  if (!jsonAttr?.value) return;

  await db
    .from(table)
    .update({ content_json: JSON.parse(jsonAttr.value) })
    .eq(idColumn, pubId);
}

async function main() {
  // Cache threads without content_json
  const { data: threads } = await db
    .from("forum_threads")
    .select("root_publication_id")
    .is("content_json", null)
    .limit(100);

  for (const t of threads || []) {
    console.log(`Caching thread: ${t.root_publication_id}`);
    await cacheContentForPublication("forum_threads", "root_publication_id", t.root_publication_id);
  }

  // Cache replies without content_json
  const { data: replies } = await db
    .from("forum_thread_replies")
    .select("publication_id")
    .is("content_json", null)
    .limit(500);

  for (const r of replies || []) {
    console.log(`Caching reply: ${r.publication_id}`);
    await cacheContentForPublication("forum_thread_replies", "publication_id", r.publication_id);
  }

  console.log("Content caching complete");
}

main();
```

### Update ForumPostContent to use cache

Once `content_json` is populated, the thread detail page can read directly
from Supabase instead of calling Lens API per-post:

```tsx
// Updated ForumPostContent (from Part 6)

export function ForumPostContent({
  contentJson, // from Supabase cache (new)
  contentUri,
  publicationId,
}: {
  contentJson?: any;
  contentUri: string | null;
  publicationId: string;
}) {
  // If cached, render immediately — no Lens API call
  if (contentJson) {
    return <Editor value={JSON.stringify(contentJson)} readOnly={true} showToc={false} />;
  }

  // Fallback: fetch from Lens (existing behavior from Part 6)
  // ... existing useEffect + fetchPost logic ...
}
```

This makes thread pages load entirely from Supabase — no Lens API calls
for content. Massive speed improvement for threads with many replies.

---

## Edge Cases

### Deleted posts

Lens `deletePost` marks a post as deleted in the indexer. The sync script
should check for this:

```ts
// In sync script, after fetching a post
if (post.isDeleted) {
  await db.from("forum_thread_replies").update({ is_hidden: true }).eq("publication_id", post.id);
}
```

### Edited posts

Lens `editPost` updates the content. The sync script should refresh the
cache:

```ts
// Compare timestamps — if Lens post is newer than Supabase, refresh
if (new Date(post.updatedAt) > new Date(supabaseRow.updated_at)) {
  await cacheContentForPublication(table, idColumn, post.id);
}
```

### Posts made via other apps

If someone replies to a thread root via Hey.xyz (using `commentOn`), the
sync script catches it because it scans `fetchPostReferences`. The reply
gets a position and appears in the thread. The category defaults to
"off-topic" if the `forumCategory` attribute is missing.

### Supabase and Lens out of sync

The sync script is idempotent — running it multiple times is safe due to
`upsert` with `onConflict`. The recovery script can be run at any time
to do a full rebuild.

---

## Checklist — Part 9 Complete When:

- [ ] Full recovery script works (empty Supabase → fully populated)
- [ ] Incremental sync script catches new/missing posts
- [ ] Sync deployed as cron job (every 5 minutes)
- [ ] Content JSON cached in Supabase for fast rendering
- [ ] Cache population script works for existing posts
- [ ] New posts automatically cache content_json on publish (update Part 4/5)
- [ ] Deleted posts handled (marked hidden in Supabase)
- [ ] Edited posts handled (cache refreshed)
- [ ] Posts from other apps handled (default category assigned)
- [ ] Recovery tested: wipe Supabase → run recovery → forum works

---

## Next: Part 10 — Polish & Deploy

Final part: performance optimization, SEO, error handling, and production
deployment.

# Part 10: Polish & Deploy

## Goal

Ship the forum to production. This covers performance optimization, SEO,
error handling, rate limiting, and deployment configuration. By the end
of this part, the forum is live and production-ready.

---

## Prerequisites

- Parts 1–9 complete (full forum working locally)
- Domain name configured (e.g., lensforum.xyz or forum.societyprotocol.xyz)
- Vercel / Railway / VPS account for hosting
- Auth server deployed (from Part 1)

---

## Step 1: Performance — Caching & ISR

### Next.js Caching Strategy

```
Page                    | Strategy           | Revalidation
------------------------|--------------------|--------------
/boards                 | ISR                | 60 seconds
/boards/:feed?category  | ISR                | 30 seconds
/thread/:pubId          | ISR                | 30 seconds
/publication/:pubId     | ISR                | 300 seconds
/search                 | Dynamic (no cache) | —
/notifications          | Dynamic (no cache) | —
/u/:username            | ISR                | 120 seconds
```

Apply to each page:

```tsx
// Board listing — revalidate every 60s
export const revalidate = 60

// Thread list — revalidate every 30s
export const revalidate = 30

// Thread detail — revalidate every 30s
export const revalidate = 30
```

### On-Demand Revalidation

When a new thread or reply is published, revalidate the affected pages
immediately instead of waiting for the ISR timer:

```ts
// src/lib/forum/revalidate.ts

import { revalidatePath } from "next/cache"

export function revalidateThread(rootPublicationId: string) {
  revalidatePath(`/thread/${rootPublicationId}`)
}

export function revalidateCategory(category: string, feed: string) {
  revalidatePath(`/boards/${feed}?category=${category}`)
  revalidatePath("/boards")
}
```

Call these after publishing in the API routes:

```ts
// In /api/forum/threads POST handler (Part 4)
revalidateCategory(body.category, body.feed)

// In /api/forum/replies POST handler (Part 5)
revalidateThread(body.threadRootPublicationId)
```

### Supabase Query Optimization

The content_json cache from Part 9 is the biggest win. Additionally:

- Thread list queries hit indexed columns only (category, is_hidden, is_pinned, last_reply_at)
- Thread detail fetches thread + replies in 2 queries (both indexed)
- Board homepage aggregates are lightweight (category counts)

No additional optimization needed unless traffic exceeds Supabase free tier.

---

## Step 2: SEO — Meta Tags & Open Graph

### Dynamic Metadata for Thread Pages

```tsx
// src/app/(app)/thread/[rootPublicationId]/page.tsx

import type { Metadata } from "next"
import { createClient } from "@/lib/db/client"

export async function generateMetadata({
  params,
}: {
  params: { rootPublicationId: string }
}): Promise<Metadata> {
  const db = await createClient()
  const { data: thread } = await db
    .from("forum_threads")
    .select("title, summary, author_username, category")
    .eq("root_publication_id", params.rootPublicationId)
    .single()

  if (!thread) {
    return { title: "Thread Not Found" }
  }

  const title = `${thread.title} — Society Protocol`
  const description = thread.summary || `Discussion in ${thread.category}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Society Protocol Forum",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}
```

### Static Metadata for Board Pages

```tsx
// src/app/(app)/boards/page.tsx

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Boards — Society Protocol",
  description: "Community discussion boards for Society Protocol governance, research, and collaboration.",
  openGraph: {
    title: "Society Protocol Forum",
    description: "Decentralized community discussion boards.",
    type: "website",
  },
}
```

### Category Page Metadata

```tsx
// src/app/(app)/boards/[feed]/page.tsx

import type { Metadata } from "next"
import { getCategoryBySlug } from "@/lib/forum/categories"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { category?: string }
}): Promise<Metadata> {
  const cat = getCategoryBySlug(searchParams.category || "")
  if (!cat) return { title: "Category Not Found" }

  return {
    title: `${cat.name} — Society Protocol`,
    description: cat.description,
  }
}
```

### robots.txt and sitemap

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://lensforum.xyz/sitemap.xml",
  }
}
```

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next"
import { createClient } from "@/lib/db/client"
import { SECTIONS } from "@/lib/forum/categories"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await createClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: "https://lensforum.xyz/boards", changeFrequency: "hourly", priority: 1 },
  ]

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = SECTIONS.flatMap((s) =>
    s.categories.map((c) => ({
      url: `https://lensforum.xyz/boards/${c.feed}?category=${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  )

  // Thread pages (most recent 500)
  const { data: threads } = await db
    .from("forum_threads")
    .select("root_publication_id, updated_at")
    .eq("is_hidden", false)
    .order("updated_at", { ascending: false })
    .limit(500)

  const threadPages: MetadataRoute.Sitemap = (threads || []).map((t) => ({
    url: `https://lensforum.xyz/thread/${t.root_publication_id}`,
    lastModified: t.updated_at,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }))

  return [...staticPages, ...categoryPages, ...threadPages]
}
```

---

## Step 3: Error Handling

### Global Error Boundary

```tsx
// src/app/(app)/error.tsx

"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground text-sm mb-4">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        Try again
      </button>
    </div>
  )
}
```

### Not Found Page

```tsx
// src/app/(app)/not-found.tsx

import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h2 className="text-xl font-bold mb-2">Page not found</h2>
      <p className="text-muted-foreground text-sm mb-4">
        The thread or page you're looking for doesn't exist.
      </p>
      <Link
        href="/boards"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        Back to Boards
      </Link>
    </div>
  )
}
```

### API Error Handling Pattern

All forum API routes should follow this pattern:

```ts
export async function POST(req: NextRequest) {
  try {
    // ... logic ...
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
```

---

## Step 4: Rate Limiting

### API Route Rate Limiting

Use a simple in-memory rate limiter for API routes. For production at
scale, use Upstash Redis or Vercel's built-in rate limiting.

```ts
// src/lib/forum/rate-limit.ts

const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const entry = requests.get(key)

  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}
```

Apply to publishing routes:

```ts
// In /api/forum/threads POST
const ip = req.headers.get("x-forwarded-for") || "unknown"
if (!rateLimit(`thread:${ip}`, 5, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 })
}

// In /api/forum/replies POST
if (!rateLimit(`reply:${ip}`, 10, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 })
}

// In /api/forum/votes POST
if (!rateLimit(`vote:${ip}`, 30, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 })
}
```

---

## Step 5: Environment Configuration

### Production .env

```env
# App
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
NEXT_PUBLIC_SITE_URL=https://lensforum.xyz

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_JWT_SECRET=...
SUPABASE_SERVICE_KEY=...
DATABASE_URL=postgresql://...

# Lens
LENS_API_KEY=...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# Auth server URL (deployed from Part 1)
NEXT_PUBLIC_AUTH_SERVER_URL=https://auth.lensforum.xyz
```

### Auth Server Production .env

```env
PRIVATE_KEY=0x...          # Signer private key
ENVIRONMENT=production
API_SECRET=0x...           # Shared with Lens API
APP_ADDRESS=0x637E685eF29403831dE51A58Bc8230b88549745E
PORT=3004
```

---

## Step 6: Deployment

### Option A: Vercel (Recommended for the App)

```bash
# In the forum app repo
vercel --prod
```

Configure in Vercel dashboard:
- Framework: Next.js
- Build command: `bun run build`
- Install command: `bun install`
- Environment variables: all from production .env
- Domain: lensforum.xyz

### Auth Server: Railway or Fly.io

The auth server is a standalone Express app — deploy separately.

```bash
# Railway
cd society-forum-auth
railway init
railway up

# Or Fly.io
fly launch
fly deploy
```

After deployment, update the auth endpoint URL registered with Lens
if it changed (re-run the registration script from Part 1).

### Sync Cron

If using Vercel, add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/forum/sync", "schedule": "*/5 * * * *" }
  ]
}
```

If using Railway/external, set up a cron job:
```bash
*/5 * * * * cd /path/to/app && npx tsx scripts/sync-forum.ts
```

---

## Step 7: Post-Launch Monitoring

### What to Watch

- Auth server response times (must be < 500ms for Lens API)
- Supabase connection pool usage
- Sync job success/failure logs
- Error rates in Vercel/hosting dashboard
- Thread/reply creation success rate

### Health Check Endpoint

```ts
// src/app/api/health/route.ts

import { createClient } from "@/lib/db/client"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = await createClient()
    const { count } = await db
      .from("forum_threads")
      .select("*", { count: "exact", head: true })

    return NextResponse.json({
      status: "ok",
      threads: count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: String(error) },
      { status: 500 },
    )
  }
}
```

---

## Launch Checklist

### Before Launch
- [ ] All Parts 1–9 complete and tested
- [ ] Auth server deployed and responding < 500ms
- [ ] Authorization Endpoint registered with Lens
- [ ] App Signer registered with Lens
- [ ] Both Groups created with MembershipApprovalGroupRule
- [ ] Both Feeds created with GroupGatedFeedRule
- [ ] Supabase tables created and categories seeded
- [ ] At least 1 admin approved in both groups
- [ ] Content cache populated for existing posts
- [ ] Sync cron job configured

### Deployment
- [ ] Production environment variables set
- [ ] App deployed to Vercel (or hosting of choice)
- [ ] Auth server deployed to Railway/Fly.io
- [ ] Domain configured and SSL active
- [ ] Health check endpoint responding

### Post-Launch
- [ ] Test login flow end-to-end on production
- [ ] Test thread creation on production
- [ ] Test reply creation on production
- [ ] Verify posts appear on Hey.xyz with correct app name
- [ ] Verify sync cron is running
- [ ] Monitor error rates for first 24 hours
- [ ] Approve initial community members

---

## What You've Built

```
┌─────────────────────────────────────────────────────┐
│  SOCIETY PROTOCOL FORUM                              │
│  Fork of fountain.ink + custom forum layer           │
│                                                      │
│  Auth Server (Express)                               │
│  ├─ /authorize — controls who can log in             │
│  └─ /verify — signs every operation                  │
│                                                      │
│  Forum App (Next.js)                                 │
│  ├─ Plate.js editor (rich text, images, code)        │
│  ├─ Board sections with 30 categories                │
│  ├─ Thread list + detail (Discourse-style)           │
│  ├─ Full-article replies (not just comments)         │
│  ├─ Voting, moderation, notifications                │
│  ├─ Search (Postgres full-text)                      │
│  └─ Mobile responsive                               │
│                                                      │
│  Lens Protocol (onchain)                             │
│  ├─ 1 App (0x637E...)                                │
│  ├─ 2 Groups (Commons + Research, approval-gated)    │
│  ├─ 2 Feeds (group-gated)                            │
│  └─ Auth Endpoint + App Signer                       │
│                                                      │
│  Supabase (speed layer)                              │
│  ├─ forum_threads + forum_thread_replies              │
│  ├─ forum_categories + forum_votes                   │
│  ├─ Content JSON cache                               │
│  └─ Full-text search index                           │
│                                                      │
│  Recovery                                            │
│  ├─ Full rebuild from Lens (if Supabase lost)        │
│  ├─ Incremental sync every 5 minutes                 │
│  └─ Content cache auto-population                    │
└─────────────────────────────────────────────────────┘
```

This replaces the original 26-feed, no-auth, limited-formatting Web3Forum
with a clean, gated, rich-content forum built on proven foundations.


# Plan Corrections — Addressing Fountain.ink Codebase Review

## Overview

The fountain.ink codebase review found 10 issues in the plan. All are valid.
This document provides the concrete fix for each one. These corrections
should be applied when executing the relevant Part.

---

## Issue 1: Import Path Mismatches (Lens SDK client vs react)

**Problem:** The plan mixes `@lens-protocol/react` hooks (useSessionClient)
with vanilla `@lens-protocol/client` server-side calls (getLensClient)
inconsistently across Parts 4/5 (services) and Part 7 (hooks).

**Fix:** Establish a clear rule:

- **Hooks (client components)** → use `@lens-protocol/react` (`useSessionClient`, `useAuthenticatedUser`)
- **Server actions / API routes** → use `@lens-protocol/client` via `getLensClient()` from `src/lib/lens/client.ts`
- **Scripts** → use `PublicClient.create()` directly

In Part 4/5's `publishThread` and `publishReply`, these are called from
client components (triggered by button click), so they should receive the
session client as a parameter rather than calling `getLensClient()`:

```ts
// BEFORE (plan)
export async function publishThread({ draft, category, walletClient })

// AFTER (corrected)
export async function publishThread({ draft, category, walletClient, sessionClient })
// sessionClient comes from useSessionClient() in the calling component
```

The `getUserAccount()` call should also be replaced with the session client's
`getAuthenticatedUser()` method, which is what fountain actually uses.

---

## Issue 2: Draft Type Is Heavier Than Assumed

**Problem:** `Draft` extends `Database["public"]["Tables"]["drafts"]["Row"]`
and has many required DB fields (id, documentId, createdAt, author, yDoc, etc.).
Constructing `const draft: Draft = { ... } as Draft` in the reply editor
will fail type-checking.

**Fix:** Create a `ForumDraft` type that contains only what the publish
functions need:

```ts
// src/lib/forum/types.ts

export interface ForumDraft {
  title: string
  contentJson: any           // Plate.js JSON
  contentMarkdown: string    // Markdown conversion
  subtitle?: string | null
  coverUrl?: string | null
  tags?: string[]
}
```

Update `publishThread` and `publishReply` to accept `ForumDraft` instead
of `Draft`. The forum publish dialog and reply editor construct a
`ForumDraft` directly from the Plate.js editor state — no dependency on
fountain's drafts table.

For the root post editor, if we want to reuse fountain's draft/autosave
system, we can create an adapter:

```ts
function draftToForumDraft(draft: Draft): ForumDraft {
  return {
    title: draft.title,
    contentJson: draft.contentJson,
    contentMarkdown: draft.contentMarkdown || "",
    subtitle: draft.subtitle,
    coverUrl: draft.coverUrl,
    tags: draft.tags,
  }
}
```

But for replies, we skip the draft system entirely and construct
`ForumDraft` directly from the editor.

---

## Issue 3: createClient Import Ambiguity

**Problem:** The plan uses `import { createClient } from "@/lib/db/client"`
everywhere, but fountain has three Supabase clients:
- `src/lib/db/client.ts` → browser client (createBrowserClient)
- `src/lib/db/server.ts` → server client (cookies, for RSC/API routes)
- `src/lib/db/service.ts` → service client (service key, admin ops)

**Fix:** Apply this mapping across ALL parts:

| Context | Import | Why |
|---|---|---|
| API routes (`route.ts`) | `import { createClient } from "@/lib/db/server"` | Server-side, has cookie access |
| Server components (pages) | `import { createClient } from "@/lib/db/server"` | RSC context |
| Client components | `import { createClient } from "@/lib/db/client"` | Browser context |
| Recovery/sync scripts | `import { createClient } from "@supabase/supabase-js"` with service key | Admin access, no cookies |
| Supabase RPC calls that bypass RLS | `import { createServiceClient } from "@/lib/db/service"` | Service role |

Specific corrections:
- Part 3 helper functions (forum_apply_vote, etc.) → called via RPC, client type doesn't matter
- Part 4/5 API routes (`/api/forum/threads`, `/api/forum/replies`) → use server client
- Part 6 page data fetching → use server client
- Part 7 vote API route → use server client
- Part 9 recovery scripts → use service client with `createClient(URL, SERVICE_KEY)`

---

## Issue 4: Auth Server Fork Assumption

**Problem:** The plan assumes forking `fountain-ink/auth` as a separate repo.
The review questions whether this repo actually exists.

**Clarification:** The `fountain-ink/auth` repo DOES exist at
`https://github.com/fountain-ink/auth` — we verified this and fetched its
complete source code earlier in this conversation. It's a real, MIT-licensed
repo with 13 commits. The full source is documented in
`MyDataSource/BuilderAuthReference.md`.

However, the review's point about fountain's internal auth is also valid.
Fountain's app has its OWN auth system at `src/lib/auth/` (JWT tokens,
session management, app tokens) that is separate from the Lens auth server.
These are two different things:

- `fountain-ink/auth` repo = Lens Authorization Endpoint (server-to-server,
  Lens API calls it to verify login/operations)
- `src/lib/auth/` in the app = Application-level auth (JWT sessions,
  cookies, user state management)

Both are needed. The plan correctly uses the external auth server for Lens
integration. The app's internal auth (`src/lib/auth/`) comes with the fork
and doesn't need modification.

No change needed to the plan, but this clarification should be noted.

---

## Issue 5: Missing (app) Route Group

**Problem:** The plan puts pages under `src/app/(app)/boards/` etc., but
fountain doesn't use an `(app)` route group — pages are directly under
`src/app/`.

**Fix:** Check fountain's actual route structure and follow it. If fountain
uses top-level routes, put forum pages at the top level:

```
src/app/boards/page.tsx              (not src/app/(app)/boards/)
src/app/boards/[feed]/page.tsx
src/app/thread/[rootPublicationId]/page.tsx
src/app/publication/[publicationId]/page.tsx
src/app/search/page.tsx
src/app/notifications/page.tsx
```

If fountain DOES use a route group (verify by checking the actual repo
structure after forking), follow their pattern. The key: don't invent
a route group that doesn't exist.

Update all Parts (6, 8, 10) that reference `src/app/(app)/` to use the
correct path.

---

## Issue 6: Routing Conflicts

**Problem:** The plan introduces `/editor/new` but fountain uses `/w/[id]`
for editing. Also `/publication/[id]` may conflict with `/p/[user]/[post]`.

**Fix:** Reuse fountain's existing route patterns:

| Plan route | Corrected route | Reason |
|---|---|---|
| `/editor/new` | `/w/new` | Matches fountain's `/w/[id]` pattern |
| `/publication/[id]` | `/p/[id]` or keep `/publication/[id]` | Avoid conflict with `/p/[user]/[post]` — use a different prefix |
| `/boards` | `/boards` | No conflict (new route) |
| `/thread/[id]` | `/thread/[id]` | No conflict (new route) |

For the "New Thread" button, link to `/w/new?mode=forum` and detect the
`mode=forum` query param in the editor page to show the ForumPublishDialog
instead of fountain's default PublishDialog.

For standalone publication view, use `/thread/[id]/reply/[replyId]` to
avoid any conflict with fountain's `/p/` routes.

---

## Issue 7: Content Rendering Should Cache from Day One

**Problem:** Part 6 fetches contentJson from Lens API per-reply client-side.
For 50 replies, that's 50 API calls. The plan defers caching to Part 9.

**Fix:** Cache `content_json` in Supabase at publish time. Move this from
Part 9 to Parts 4 and 5.

Add `content_json JSONB` column to both tables in Part 3's migration:

```sql
-- Add to forum_threads table definition
content_json JSONB,

-- Add to forum_thread_replies table definition
content_json JSONB,
```

In Part 4's `publishThread` and Part 5's `publishReply`, include
`content_json` when inserting into Supabase:

```ts
// In the API route, when inserting
{
  ...otherFields,
  content_json: body.contentJson,  // Plate.js JSON, passed from publish function
}
```

In Part 6's `ForumPostContent`, read from Supabase first:

```tsx
// If content_json is available from Supabase (passed as prop), render directly
if (contentJson) {
  return <Editor value={JSON.stringify(contentJson)} readOnly={true} />
}
// Fallback to Lens API only if cache is missing
```

Part 9's cache script then only handles backfilling old posts that were
published before the cache was added.

---

## Issue 8: RLS Policies Too Permissive

**Problem:** `USING (true)` for inserts/updates means any authenticated
user can modify any thread or reply.

**Fix:** Tighten RLS policies in Part 3's migration:

```sql
-- Threads: anyone can read, only author can update their own
CREATE POLICY "Public read threads" ON forum_threads
  FOR SELECT USING (true);

CREATE POLICY "Authenticated insert threads" ON forum_threads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Author or admin update threads" ON forum_threads
  FOR UPDATE USING (
    author_address = (current_setting('request.jwt.claims', true)::json->>'metadata')::json->>'address'
    OR (current_setting('request.jwt.claims', true)::json->>'metadata')::json->>'isAdmin' = 'true'
  );

-- Replies: same pattern
CREATE POLICY "Public read replies" ON forum_thread_replies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated insert replies" ON forum_thread_replies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Author or admin update replies" ON forum_thread_replies
  FOR UPDATE USING (
    author_address = (current_setting('request.jwt.claims', true)::json->>'metadata')::json->>'address'
    OR (current_setting('request.jwt.claims', true)::json->>'metadata')::json->>'isAdmin' = 'true'
  );

-- Votes: users can only manage their own votes
CREATE POLICY "Public read votes" ON forum_votes
  FOR SELECT USING (true);

CREATE POLICY "Own votes only" ON forum_votes
  FOR ALL USING (
    account_address = (current_setting('request.jwt.claims', true)::json->>'metadata')::json->>'address'
  );
```

Note: The exact JWT claim path depends on how fountain's JWT is structured.
From CLAUDE.md, the JWT metadata contains `{ isAdmin, username, address }`.
Verify the exact path after forking.

For operations that need to bypass RLS (sync scripts, admin actions), use
the service client from `src/lib/db/service.ts`.

---

## Issue 9: Missing Middleware Integration

**Problem:** Fountain has `src/middleware.ts` that handles auth redirects
and session validation. The plan doesn't mention it.

**Fix:** After forking, inspect `src/middleware.ts` and add forum routes
to its configuration. Likely changes:

```ts
// In middleware.ts, add forum routes to the matcher or auth check

// If middleware protects certain routes, ensure forum routes are included:
// - /boards → public (no auth required to browse)
// - /thread/[id] → public (no auth required to read)
// - /w/new?mode=forum → protected (auth required to create)
// - /api/forum/* → varies (some public, some protected)
```

The specific changes depend on what the middleware does. Add this as a
sub-step in Part 1 (Step 8: Initial Cleanup) — inspect and adapt middleware.

---

## Issue 10: usePublishDraft Hook Coupling

**Problem:** The ForumPublishDialog imports `usePublishDraft` which is
tightly coupled to fountain's draft system (Supabase drafts table +
collaborative editing).

**Fix:** For the ForumPublishDialog (thread creation), there are two paths:

**Path A: Reuse fountain's draft system (recommended for root posts)**
The user writes in fountain's editor at `/w/[id]`, which auto-saves to
the drafts table. When they click "Create Thread", the ForumPublishDialog
reads the draft via `usePublishDraft` (which already works), converts it
to a `ForumDraft`, and publishes. This gives us autosave for free.

**Path B: Skip drafts for replies**
The reply editor (Part 5) does NOT use `usePublishDraft`. It manages
editor state locally in React state and constructs a `ForumDraft` directly
when the user clicks "Post Reply". No draft table involvement.

Updated Part 4 dialog:

```tsx
// ForumPublishDialog — uses fountain's draft system for root posts
const { getDraft } = usePublishDraft(documentId)

async function onSubmit(values: FormValues) {
  const draft = getDraft()
  if (!draft) return

  // Convert fountain Draft → ForumDraft
  const forumDraft: ForumDraft = {
    title: values.title,
    contentJson: draft.contentJson,
    contentMarkdown: draft.contentMarkdown || "",
    tags: draft.tags,
  }

  const result = await publishThread({
    draft: forumDraft,
    category: values.category,
    walletClient,
    sessionClient,
  })
}
```

Updated Part 5 reply editor:

```tsx
// ThreadReplyEditor — NO usePublishDraft, manages state locally
const [editorValue, setEditorValue] = useState(initialEditorValue)

async function handlePublish() {
  const forumDraft: ForumDraft = {
    title: "",
    contentJson: editorValue,
    contentMarkdown: serializeToMarkdown(editorValue),
  }

  const result = await publishReply({
    draft: forumDraft,
    threadRootPublicationId,
    threadFeed,
    walletClient,
    sessionClient,
  })
}
```

---

## Summary of Changes by Part

| Part | Changes Needed |
|---|---|
| Part 3 | Add `content_json JSONB` columns; tighten RLS policies |
| Part 4 | Accept `sessionClient` param; use `ForumDraft` type; cache `content_json` at publish; use `/w/new?mode=forum` route |
| Part 5 | Accept `sessionClient` param; use `ForumDraft` type; cache `content_json` at publish; no `usePublishDraft` |
| Part 6 | Fix Supabase imports to `server.ts`; read `content_json` from Supabase first; fix route paths (no `(app)` group) |
| Part 7 | Consistent use of `@lens-protocol/react` for hooks |
| Part 8 | Fix route references (`/w/new` not `/editor/new`); integrate with middleware |
| Part 9 | Recovery/sync scripts use service client; cache backfill only for pre-existing posts |
| Part 10 | RLS policies already tightened in Part 3 |

All other aspects of the plan remain valid as-is.


## Yes, you'd be running your own instance of Fountain.ink

When you bun install && bun run dev, you get a fully functional local copy of the Fountain.ink application. But it's not standalone — it connects to 
external services:

Your local Next.js app (localhost:3000)
    │
    ├── Supabase (cloud) ← you need YOUR OWN project
    │     └── stores: users, drafts, blogs, posts, curated, feedback
    │
    ├── Lens Protocol (cloud) ← shared public infrastructure
    │     └── YOUR Lens App address (0x637E...)
    │     └── login, publish, reactions, social graph
    │
    ├── Grove / Lens Storage (cloud) ← shared public infrastructure
    │     └── article content, images, metadata
    │
    ├── WalletConnect (cloud) ← you need YOUR OWN project ID
    │     └── wallet connection UI
    │
    ├── Listmonk (optional, self-hosted) ← newsletter system
    │
    └── Iframely (optional) ← embed previews


So you'd have your own Fountain.ink instance that:
- Has its own Supabase database (your users, your drafts, your curated posts)
- Publishes to Lens under YOUR app identity (not Fountain's)
- Shares the same Lens social graph (posts are visible on Hey.xyz, other Lens apps)
- Has the same editor, same UI, same everything

The key thing: Lens Protocol is shared infrastructure. A post published through your fork is a real Lens publication. It shows up everywhere. The 
difference is the app field says your app name instead of "Fountain."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## Why the 10 errors exist — and yes, your intuition is right

The errors exist precisely BECAUSE the plan is doing what you described: taking Fountain.ink's polished codebase and grafting forum functionality 
onto it. The friction comes from the fact that Fountain was built as a blogging platform and you're turning it into a forum platform. The two have 
different data models:

| Concept | Fountain (Blog) | Your Fork (Forum) |
|---|---|---|
| Content unit | Article (standalone) | Thread (root + replies) |
| Organization | Blogs (per-user) | Boards → Categories → Threads |
| Publishing target | User's blog feed | Commons or Research feed |
| Replies | Lens comments (lightweight) | Full articles with commentOn (heavyweight) |
| Draft system | Supabase drafts table + collab editing | Reuse for root posts, skip for replies |
| Content display | Single article page | Stacked thread view (Discourse-style) |

The 10 errors were all symptoms of the plan not fully accounting for how tightly Fountain's code is wired to the blog model. Specifically:

- **Draft type** (error 2) — Fountain's Draft is a database row. Forum replies don't need a database row.
- **Supabase clients** (error 3) — Fountain has 3 clients for different contexts. The plan used the wrong one everywhere.
- **Route structure** (errors 5, 6) — Fountain's routes are blog-centric (/b/[blog], /p/[user]/[post], /w/[id]). Forum routes (/boards, /thread) are 
new additions that must coexist.
- **usePublishDraft** (error 10) — Fountain's publish flow assumes a draft exists in Supabase. Forum replies bypass that.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## How the finished product actually works

Here's the complete picture of what you'll have after all 10 parts:

┌─────────────────────────────────────────────────────────────────┐
│                    YOUR DEPLOYED APP                             │
│              (fork of fountain.ink + forum layer)                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  WHAT THE USER SEES                                      │    │
│  │                                                          │    │
│  │  /boards                                                 │    │
│  │    → Board homepage with 5 sections, 30 categories       │    │
│  │    → Thread counts, latest activity per category         │    │
│  │    → Sidebar with community info                         │    │
│  │                                                          │    │
│  │  /boards/commons?category=beginners                      │    │
│  │    → Thread list: title, author, replies, views, votes   │    │
│  │    → Pinned threads first, then by latest activity       │    │
│  │    → "New Thread" button (requires login + group member) │    │
│  │                                                          │    │
│  │  /thread/0x01-0x42                                       │    │
│  │    → Root post rendered as full rich article              │    │
│  │    → Reply #1, #2, #3... stacked below (Discourse-style) │    │
│  │    → Each reply is full rich content (images, code, etc) │    │
│  │    → Vote buttons on every post                          │    │
│  │    → Reply editor at bottom (same Plate.js editor)       │    │
│  │                                                          │    │
│  │  /w/[id]?mode=forum                                      │    │
│  │    → Full Plate.js editor (same as Fountain's)           │    │
│  │    → Bold, italic, headings, code blocks, images, embeds │    │
│  │    → Auto-saves to drafts table                          │    │
│  │    → "Create Thread" → pick category → publish           │    │
│  │                                                          │    │
│  │  ALSO STILL WORKS (inherited from Fountain):             │    │
│  │    → /settings (profile, app settings)                   │    │
│  │    → /search (now searches forum threads too)            │    │
│  │    → /notifications (filtered to forum feeds)            │    │
│  │    → /u/[user] (profile + forum activity tab)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  WHAT HAPPENS WHEN SOMEONE CREATES A THREAD              │    │
│  │                                                          │    │
│  │  1. User writes in Plate.js editor                       │    │
│  │  2. Clicks "Create Thread", picks category               │    │
│  │  3. App builds Lens article metadata:                    │    │
│  │     - title, markdown content, Plate.js JSON             │    │
│  │     - forumCategory attribute = "beginners"              │    │
│  │     - tags = ["beginners", ...]                          │    │
│  │  4. Uploads metadata to Grove → gets contentUri          │    │
│  │  5. Publishes to Lens: post(contentUri, feed=COMMONS)    │    │
│  │     - Wallet signs the transaction                       │    │
│  │     - Auth server verifies via App Signer                │    │
│  │  6. Writes to Supabase forum_threads:                    │    │
│  │     - root_publication_id, title, category               │    │
│  │     - content_text (for search), content_json (for render)│   │
│  │     - author_address, author_username                    │    │
│  │  7. Redirects to /thread/[new-publication-id]            │    │
│  │                                                          │    │
│  │  RESULT:                                                 │    │
│  │  - Thread visible on YOUR forum instantly                │    │
│  │  - Thread visible on Hey.xyz as a standalone article     │    │
│  │  - Thread visible on ANY Lens app that reads your feed   │    │
│  │  - Content permanently stored on Grove (decentralized)   │    │
│  │  - If Supabase dies, recoverable from Lens               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  WHAT HAPPENS WHEN SOMEONE REPLIES                       │    │
│  │                                                          │    │
│  │  Same as above, except:                                  │    │
│  │  - Published with commentOn: { post: rootPublicationId } │    │
│  │  - Goes to same feed as root post                        │    │
│  │  - Tracked in forum_thread_replies (not forum_threads)   │    │
│  │  - Thread's reply_count and last_reply_at updated        │    │
│  │  - No draft system — editor state is local only          │    │
│  │                                                          │    │
│  │  On Lens, the reply IS a comment on the root post.       │    │
│  │  On your forum, it's displayed as Reply #N in the thread.│    │
│  │  On Hey.xyz, it appears as a standalone article that     │    │
│  │  happens to be a comment.                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ACCESS CONTROL                                          │    │
│  │                                                          │    │
│  │  READING: Anyone can browse boards and read threads.     │    │
│  │  No login required.                                      │    │
│  │                                                          │    │
│  │  WRITING: Requires:                                      │    │
│  │  1. Lens account (connect wallet)                        │    │
│  │  2. Membership in Commons Group OR Research Group        │    │
│  │     (approval-gated — admin must approve)                │    │
│  │  3. Auth server says "allowed: true"                     │    │
│  │                                                          │    │
│  │  MODERATING: Requires group admin status                 │    │
│  │  - Hide replies, ban members, pin/lock threads           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

EXTERNAL SERVICES:

┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│  Auth Server  │  │   Supabase   │  │     Lens Protocol        │
│  (Express)    │  │   (Postgres) │  │     (Onchain)            │
│               │  │              │  │                          │
│  /authorize   │  │ forum_threads│  │  Your App (0x637E...)    │
│  /verify      │  │ forum_replies│  │  Commons Group + Feed    │
│               │  │ forum_votes  │  │  Research Group + Feed   │
│  Controls who │  │ forum_cats   │  │  All publications        │
│  can log in   │  │ users,drafts │  │  All reactions           │
│  Signs every  │  │ (fountain's) │  │  All social graph data   │
│  operation    │  │              │  │                          │
│  Deployed on  │  │  Speed layer │  │  Source of truth         │
│  Railway/Fly  │  │  + search    │  │  Permanent + recoverable │
└──────────────┘  └──────────────┘  └──────────────────────────┘

                  ┌──────────────┐
                  │    Grove     │
                  │  (Storage)   │
                  │              │
                  │  Article     │
                  │  content,    │
                  │  images,     │
                  │  metadata    │
                  │              │
                  │  Decentralized│
                  │  permanent   │
                  └──────────────┘

SYNC & RECOVERY:

  Every 5 minutes, a cron job:
  - Scans Lens feeds for posts not in Supabase
  - Adds missing threads/replies
  - Catches posts made via Hey.xyz or other Lens apps
  - Handles deleted/edited posts

  If Supabase is wiped:
  - Run recovery script
  - Reads ALL posts from both feeds via Lens API
  - Reconstructs threads via commentOn relationships
  - Rebuilds content_json cache from metadata attributes
  - Forum is back online with full history


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## What you keep from Fountain vs. what you add

Think of it as layers:

Layer 3 (NEW):     Forum UI — boards, threads, replies, voting, moderation
Layer 2 (NEW):     Forum data — forum_* tables, publish services, API routes
Layer 1 (KEPT):    Fountain core — editor, auth, Lens client, Supabase, UI kit
Layer 0 (KEPT):    Next.js + Plate.js + Tailwind + Radix UI


You're not replacing Fountain. You're building on top of it. The editor that makes Fountain feel professional? That's your thread editor. The auth 
flow? That's your login. The component library (all those Radix UI primitives, the toast system, the dialogs)? That's your forum UI foundation.

The forum-specific code (boards, threads, categories, voting, recovery) is a new layer that plugs into Fountain's existing infrastructure. Fountain's
blog features (/b/, /p/, blog settings, newsletter) can be gradually removed or left dormant — they don't interfere with the forum routes.

That's exactly why the plan works: you're not fighting the codebase, you're extending it.