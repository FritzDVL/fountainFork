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
