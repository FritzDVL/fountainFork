# Phase 6: Publish Flow — Threads & Replies

## Goal

Wire the composer to actually publish content. Thread creation publishes
a standalone Lens article to the correct feed and tracks it in Supabase.
Reply publishing uses `commentOn` to link to the root post. By the end,
users can create threads and reply to them.

## Depends On

- Phase 2 (feeds exist onchain)
- Phase 4 (pages exist to display results)
- Phase 5 (composer UI exists)

---

## Key Type: ForumDraft

Fountain's `Draft` type is tied to the Supabase `drafts` table and has
many required DB fields. Forum publish functions use a lightweight type:

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

- Thread creation: composer builds `ForumDraft` from editor state
- Replies: composer builds `ForumDraft` directly (no draft table)

## Steps

### 6.1 Publish Thread Service

**File:** `src/lib/forum/publish-thread.ts`

```
Input: ForumDraft + category slug + walletClient
Output: { success, publicationId } or { success: false, error }
```

Pipeline:
1. Validate category exists via `getCategoryBySlug()`
2. Build article metadata with `article()` from `@lens-protocol/metadata`
   - `attributes`: contentJson (JSON), forumCategory (STRING)
   - `tags`: [category, ...userTags]
3. Upload to Grove → `contentUri`
4. Determine feed from category: `FEED_MAP[cat.feed]`
5. `post(lens, { contentUri, feed })` → publish to Lens
6. `fetchPost(lens, { txHash })` → get publication ID
7. POST `/api/forum/threads` → track in Supabase

**Lens SDK usage:** Receives `sessionClient` as parameter (from
`useSessionClient()` in the calling component). Does NOT call
`getLensClient()` — that's for server-side only.

### 6.2 Thread Tracking API Route

**File:** `src/app/api/forum/threads/route.ts`

Uses `import { createClient } from "@/lib/db/server"` (server client).

POST handler:
1. Insert into `forum_threads` (including `content_json` for cache)
2. Call `forum_add_thread_to_category(slug)` to increment count
3. Return `{ success: true }`

### 6.3 Publish Reply Service

**File:** `src/lib/forum/publish-reply.ts`

```
Input: ForumDraft + threadRootPublicationId + threadFeed + walletClient
Output: { success, publicationId } or { success: false, error }
```

Pipeline:
1. Build article metadata with `forumThreadId` attribute (for recovery)
2. Upload to Grove → `contentUri`
3. `post(lens, { contentUri, feed, commentOn: { post: rootPubId } })`
4. `fetchPost(lens, { txHash })` → get publication ID
5. POST `/api/forum/replies` → track in Supabase

### 6.4 Reply Tracking API Route

**File:** `src/app/api/forum/replies/route.ts`

Uses server client.

POST handler:
1. Find thread by `root_publication_id`
2. Calculate `position = reply_count + 1`
3. Insert into `forum_thread_replies` (including `content_json`)
4. Call `forum_add_reply(thread_id, reply_time)`
5. Return `{ success: true, position }`

### 6.5 Wire Composer Submit

In `composer-panel.tsx`, the submit button calls:
- Thread mode → `publishThread({ draft, category, walletClient })`
- Reply mode → `publishReply({ draft, threadRef, walletClient })`

On success:
1. Close composer
2. Navigate to `/thread/[publicationId]` (new thread) or refresh page (reply)
3. Toast: "Thread published!" or "Reply published!"

On failure:
1. Toast with error message
2. Composer stays open (content preserved)

### 6.6 Content Caching at Publish Time

Both publish services pass `contentJson` to the API routes, which store
it in the `content_json` JSONB column. This means thread detail pages
can render entirely from Supabase — no Lens API calls needed for content.

### 6.7 Metadata Attributes for Recovery

Every publication includes attributes that enable recovery if Supabase is lost:

**Thread root:**
```json
{ "key": "contentJson", "type": "JSON", "value": "<plate.js json>" }
{ "key": "forumCategory", "type": "STRING", "value": "beginners" }
```

**Reply:**
```json
{ "key": "contentJson", "type": "JSON", "value": "<plate.js json>" }
{ "key": "forumThreadId", "type": "STRING", "value": "<root pub id>" }
```

---

## Onchain Result After Publishing

```
Publication A (thread root)
  ├─ commentOn: null
  ├─ feed: COMMONS_FEED
  ├─ metadata.attributes: [forumCategory: "beginners", contentJson: {...}]
  │
  ├── Publication B (reply #1)
  │   ├─ commentOn: A
  │   ├─ feed: COMMONS_FEED
  │   └─ metadata.attributes: [forumThreadId: "A", contentJson: {...}]
  │
  └── Publication C (reply #2)
      ├─ commentOn: A
      ├─ feed: COMMONS_FEED
      └─ metadata.attributes: [forumThreadId: "A", contentJson: {...}]
```

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T6.1 | Open composer, write content, select category, submit | Thread published |
| T6.2 | Check Hey.xyz for new publication | Post visible with your app name |
| T6.3 | Check `forum_threads` table | Row exists with correct category |
| T6.4 | Check `forum_categories` thread_count | Incremented by 1 |
| T6.5 | Check `content_json` column | Plate.js JSON stored |
| T6.6 | Navigate to `/thread/[id]` | Thread renders with content |
| T6.7 | Open reply composer on thread page | Composer opens in reply mode |
| T6.8 | Submit reply | Reply published with `commentOn` |
| T6.9 | Check `forum_thread_replies` table | Row exists with correct position |
| T6.10 | Thread `reply_count` updated | Incremented by 1 |
| T6.11 | Thread `last_reply_at` updated | Set to reply timestamp |
| T6.12 | Refresh thread page | New reply appears at bottom |
| T6.13 | Publish without group membership | Rejected by GroupGatedFeedRule |
| T6.14 | Check `forumCategory` attribute on Lens | Present in publication metadata |
| T6.15 | Check `forumThreadId` attribute on reply | Present in reply metadata |

## Files Created

```
src/lib/forum/types.ts                    — ForumDraft interface
src/lib/forum/publish-thread.ts           — thread publish service
src/lib/forum/publish-reply.ts            — reply publish service
src/app/api/forum/threads/route.ts        — thread tracking API
src/app/api/forum/replies/route.ts        — reply tracking API
```
