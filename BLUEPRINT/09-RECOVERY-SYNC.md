# Phase 9: Recovery & Sync

## Goal

Build the safety net: a full recovery script that reconstructs all forum
data from Lens if Supabase is lost, and a background sync job that keeps
Supabase in sync with onchain state. By the end, the forum is resilient
to data loss.

## Depends On

Phase 6 (publish flow exists — threads and replies on Lens)

---

## Why This Matters

```
Source of truth:  Lens Protocol + Grove Storage (permanent, decentralized)
Speed layer:      Supabase (fast reads, search, view counts)
```

If Supabase is wiped → recovery script reads Lens → rebuilds everything.
If a post is made via Hey.xyz → sync job catches it → adds to Supabase.

## Scripts

### 9.1 Full Recovery Script

**File:** `scripts/recover-forum.ts`

Run when: Supabase is empty, corrupted, or migrated to a new project.

**Uses:** Service client (`createClient(URL, SERVICE_KEY)` from `@supabase/supabase-js`).
NOT the server client (no cookies in scripts).

**Algorithm:**
```
For each feed (commons, research):
  1. fetchPosts(client, { filter: { feeds: [{ feed: ADDRESS }] } })
     → paginate through ALL posts
  2. For each post where commentOn is null:
     → Thread root
     → Read forumCategory from metadata attributes (default: "off-topic")
     → UPSERT into forum_threads
  3. For each thread root:
     → fetchPostReferences(rootId, [CommentOn])
     → Order by timestamp
     → UPSERT into forum_thread_replies with position = index + 1
  4. Recount category thread_counts
```

**Content cache rebuild:**
- Read `contentJson` attribute from each publication's metadata
- Store in `content_json` JSONB column
- If attribute missing, fetch `contentUri` from Grove and parse

**Idempotent:** Uses UPSERT with `onConflict` on unique columns.
Safe to run multiple times.

### 9.2 Incremental Sync Script

**File:** `scripts/sync-forum.ts` (or `src/app/api/forum/sync/route.ts`)

Run when: every 5 minutes via cron.

**Uses:** Service client.

**Algorithm:**
```
For each feed:
  1. Fetch recent posts (last 100)
  2. For each root post (no commentOn):
     → Check if exists in forum_threads
     → If missing: insert (catches posts from other Lens apps)
  3. For each reply (has commentOn):
     → Check if exists in forum_thread_replies
     → If missing: find parent thread, calculate position, insert
  4. Check for deleted posts (post.isDeleted):
     → Mark is_hidden = true in Supabase
  5. Check for edited posts (post.updatedAt > supabase.updated_at):
     → Refresh content cache
```

### 9.3 Content Cache Backfill

**File:** `scripts/cache-content.ts`

Run when: after adding `content_json` column to existing data, or after
recovery script (which may not have all content cached).

**Algorithm:**
```
1. Query forum_threads WHERE content_json IS NULL (limit 100)
2. For each: fetchPost → read contentJson attribute → UPDATE
3. Query forum_thread_replies WHERE content_json IS NULL (limit 500)
4. For each: fetchPost → read contentJson attribute → UPDATE
```

---

## Deployment Options for Sync

| Option | How | Best For |
|---|---|---|
| Vercel Cron | `vercel.json` → `{ "crons": [{ "path": "/api/forum/sync", "schedule": "*/5 * * * *" }] }` | Vercel hosting |
| System Cron | `*/5 * * * * npx tsx scripts/sync-forum.ts` | VPS hosting |
| Supabase Edge Function | Deno function + pg_cron trigger | Supabase-native |
| GitHub Actions | Scheduled workflow every 5 min | Free tier |

---

## Edge Cases

| Case | Handling |
|---|---|
| Post made via Hey.xyz | Sync catches it, assigns default category |
| Post deleted on Lens | Sync marks `is_hidden = true` |
| Post edited on Lens | Sync refreshes content cache |
| Two replies at same time | Position may have gap — acceptable, recovery re-numbers |
| `forumCategory` attribute missing | Default to "off-topic" |
| `contentJson` attribute missing | Fetch from Grove via `contentUri` |
| Supabase fully wiped | Run full recovery script |

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T9.1 | Run recovery on empty Supabase | All threads + replies reconstructed |
| T9.2 | Thread count matches Lens post count | No missing threads |
| T9.3 | Reply positions are sequential | Ordered by timestamp |
| T9.4 | Category assignments correct | Read from `forumCategory` attribute |
| T9.5 | `content_json` populated | Plate.js JSON in JSONB column |
| T9.6 | Forum pages work after recovery | Landing, thread list, thread detail all render |
| T9.7 | Publish a post via Hey.xyz | Sync picks it up within 5 minutes |
| T9.8 | Delete a post on Lens | Sync marks it hidden |
| T9.9 | Run recovery twice | No duplicates (UPSERT is idempotent) |
| T9.10 | Sync cron runs on schedule | Logs confirm execution every 5 min |
| T9.11 | Cache backfill fills NULL content_json | All rows populated |

## Files Created

```
scripts/recover-forum.ts          — full recovery from Lens
scripts/sync-forum.ts             — incremental sync (also usable as API route)
scripts/cache-content.ts          — backfill content_json cache
src/app/api/forum/sync/route.ts   — cron endpoint (if using Vercel)
```
