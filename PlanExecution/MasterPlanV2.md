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
