# Phase 9: Recovery & Sync (UPDATED)

## Goal

Build the safety net: a full recovery script that reconstructs all forum
data from Lens Protocol if Supabase is lost, and a background sync job
that keeps Supabase current. By the end, the forum is resilient to data
loss, server failure, and even hostile attacks on the database.

## Depends On

Phase 6 ✅ (posts exist on Lens with metadata attributes)
Phase 8 ✅ (tags exist on research threads)

---

## Why This Matters

```
PERMANENT LAYER (cannot be destroyed):
  Lens Protocol  →  every post is an onchain article
  Grove Storage  →  full content stored permanently
  Metadata       →  forumCategory, forumThreadId, contentJson, tags

REPLACEABLE LAYER (can be rebuilt from permanent layer):
  Supabase       →  thread structure, view counts, search index
  VPS            →  the server running the app
```

If Supabase is wiped, hacked, or corrupted:
  → Run recovery script
  → Reads every post from Lens Feeds
  → Reconstructs forum_threads + forum_thread_replies
  → Forum is back online

If the entire VPS is destroyed:
  → Spin up new server anywhere
  → Clone the repo, set up Supabase
  → Run recovery script
  → Everything is restored

The forum cannot be permanently killed as long as Lens Protocol exists.

---

## What We Store on Lens (the recovery keys)

Every post we publish includes metadata attributes that act as
recovery instructions. Here's exactly what each post type stores:

### Thread Root (published via `publish-thread.ts`)

```
Lens article metadata:
  title:      "My Thread Title"
  content:    "My Thread Title — https://forum.societyprotocol.io"  (display only)
  tags:       ["consensus", "hunting", "game-theory"]               (category + tags)
  attributes:
    - forumCategory: "consensus"          ← identifies this as a thread root
    - contentJson: { ... }                ← full Plate.js document
  feed:       COMMONS_FEED or RESEARCH_FEED
```

### Reply (published via `publish-reply.ts`)

```
Lens article metadata:
  title:      ""
  content:    "Reply — https://forum.societyprotocol.io"  (display only)
  attributes:
    - forumThreadId: "0x1234...abcd"      ← root publication ID (links to parent)
    - contentJson: { ... }                ← full Plate.js document
  feed:       same feed as parent thread
```

### How Recovery Reads This

```
For each post in a Feed:
  if post has "forumCategory" attribute → it's a THREAD ROOT
  if post has "forumThreadId" attribute → it's a REPLY
  if post has neither                   → it's not a forum post (skip)
```

---

## Fountain Code to Study First

| Need | Fountain file | What to learn |
|---|---|---|
| Fetch posts from feed | Used throughout app | `fetchPosts()` with feed filter |
| Read metadata attributes | `src/app/p/[user]/[post]/page.tsx` | `post.metadata.attributes` |
| Service client (no cookies) | `src/lib/db/service.ts` | For scripts running outside browser |
| Lens client setup | `src/lib/lens/client.ts` | `getLensClient()` pattern |

---

## Scripts

### 9.1 Full Recovery Script

**File:** `scripts/recover-forum.ts`

**When to run:** Supabase is empty, corrupted, or migrated to new project.

**How it works:**

```
Step 1: Connect to Lens (public client, no auth needed)
Step 2: Connect to Supabase (service client with SERVICE_ROLE_KEY)

Step 3: For each feed (commons, research):
  Paginate through ALL posts in the feed:
    fetchPosts(client, {
      filter: { feeds: [{ feed: evmAddress(FEED_ADDRESS) }] }
    })

Step 4: Classify each post:
  Read post.metadata.attributes array
  Find attribute with key "forumCategory" → THREAD ROOT
  Find attribute with key "forumThreadId" → REPLY
  Neither → skip (not a forum post)

Step 5: Process thread roots:
  For each thread root:
    Extract: title, forumCategory, contentJson, tags
    Determine feed from which Feed we fetched it
    Extract author from post.author
    UPSERT into forum_threads (conflict on root_publication_id)

Step 6: Process replies:
  Sort all replies by post.timestamp (ascending)
  For each reply:
    Extract: forumThreadId (= parent's publication ID), contentJson
    Look up parent thread in forum_threads
    Calculate position (count existing replies + 1)
    UPSERT into forum_thread_replies (conflict on publication_id)

Step 7: Recount statistics:
  UPDATE forum_threads SET reply_count = (SELECT count FROM forum_thread_replies)
  UPDATE forum_categories SET thread_count = (SELECT count FROM forum_threads)

Step 8: Log results:
  "Recovered X threads, Y replies from Z total posts"
```

**Key details:**
- Uses Lens public client (no authentication needed to READ)
- Uses Supabase service client (bypasses RLS for bulk inserts)
- UPSERT with `onConflict` makes it safe to run multiple times
- Content comes from `contentJson` attribute, NOT from `content` field
  (because `content` field only has "Title — URL" due to Lens Display mode)
- Tags extracted from Lens metadata `tags` array, first tag is the category

**Pagination:**
Lens `fetchPosts` returns paginated results. The script must loop:
```ts
let cursor = undefined;
while (true) {
  const result = await fetchPosts(client, { filter, cursor });
  // process result.items
  if (!result.pageInfo.next) break;
  cursor = result.pageInfo.next;
}
```

### 9.2 Incremental Sync Script

**File:** `scripts/sync-forum.ts`

**When to run:** Every 5 minutes via system cron on VPS.

**How it works:**

```
Step 1: Fetch recent posts from each feed (last 50)
Step 2: For each post with forumCategory attribute:
  Check if root_publication_id exists in forum_threads
  If missing → insert (new thread published elsewhere or missed)
Step 3: For each post with forumThreadId attribute:
  Check if publication_id exists in forum_thread_replies
  If missing → insert (new reply)
Step 4: Check for deleted posts:
  If post.isDeleted → mark is_hidden = true in Supabase
Step 5: Log: "Synced: X new threads, Y new replies"
```

**Why this catches external posts:**
If someone publishes to our Feed using a different app (Hey.xyz,
or a fork of our forum), the post lands in the same Lens Feed.
The sync script picks it up and adds it to Supabase. The forum
shows it automatically.

### 9.3 Cron Setup on VPS

**File:** System crontab on VPS (72.61.119.100)

```bash
# Edit crontab
crontab -e

# Add sync job (every 5 minutes)
*/5 * * * * cd /opt/society-forum && npx tsx scripts/sync-forum.ts >> /var/log/forum-sync.log 2>&1
```

---

## What Recovery CANNOT Restore

| Data | Recoverable? | Why |
|---|---|---|
| Thread content | ✅ Yes | `contentJson` attribute on Lens |
| Thread structure | ✅ Yes | `forumCategory` + `forumThreadId` attributes |
| Author info | ✅ Yes | `post.author` on Lens |
| Tags | ✅ Yes | `tags` array in Lens metadata |
| Timestamps | ✅ Yes | `post.timestamp` on Lens |
| View counts | ❌ No | Supabase-only, not stored on Lens |
| Pin/lock status | ❌ No | Supabase-only moderation flags |
| Vote counts | ⚠️ Partial | Lens reactions exist but we'd need to re-fetch per post |
| Hidden status | ❌ No | Supabase-only (but deleted posts on Lens are detectable) |

View counts and moderation state are lost on full recovery. This is
acceptable — they're operational data, not content.

---

## Edge Cases

| Case | Handling |
|---|---|
| Post made via Hey.xyz to our Feed | Sync catches it, `forumCategory` attribute likely missing → default to "off-topic" |
| Post deleted on Lens | Sync marks `is_hidden = true` |
| `contentJson` attribute missing | Fetch content from Grove via `post.metadata.contentUri` and parse |
| `forumCategory` missing on thread | Default to "off-topic" category |
| Two replies with same timestamp | Position assigned by order received — minor gap acceptable |
| Recovery run twice | UPSERT prevents duplicates — completely safe |
| Supabase partially corrupted | Recovery fills gaps without destroying existing data |
| `pending-` publication IDs (Phase 6b) | If optimistic publish is implemented later, sync detects stuck pending IDs and can retry |

---

## Execution Order

| Step | What | Effort |
|---|---|---|
| 9.1 | Full recovery script | Medium |
| 9.2 | Incremental sync script | Medium |
| 9.3 | Cron setup on VPS | Small |
| 9.4 | Test: wipe Supabase, run recovery, verify | — |
| 9.5 | Test: publish via different method, verify sync catches it | — |

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T9.1 | Run recovery on empty Supabase | All threads + replies reconstructed |
| T9.2 | Thread count matches Lens post count | No missing threads |
| T9.3 | Reply positions are sequential | Ordered by timestamp |
| T9.4 | Category assignments correct | Read from `forumCategory` attribute |
| T9.5 | Tags populated on research threads | Extracted from Lens metadata tags |
| T9.6 | `content_json` populated | Plate.js JSON in JSONB column |
| T9.7 | Forum pages work after recovery | Landing, thread list, thread detail all render |
| T9.8 | Run recovery twice | No duplicates (UPSERT is idempotent) |
| T9.9 | Sync cron runs on VPS | Logs confirm execution every 5 min |
| T9.10 | Post published externally | Sync picks it up within 5 minutes |

## Files to Create

```
scripts/recover-forum.ts     — full recovery from Lens
scripts/sync-forum.ts        — incremental sync (cron job)
```


---

## Completion Notes (2026-04-07)

### What Was Done
- Step 9.1: `scripts/recover-forum.ts` — full recovery from Lens
- Step 9.2: `scripts/sync-forum.ts` — incremental sync for cron
- Step 9.3: Cron setup deferred to Phase 10 (VPS deployment)

### Files Created
```
scripts/recover-forum.ts     ✅ Full recovery
scripts/sync-forum.ts        ✅ Incremental sync
```

### Future Refinement: Persistent Operational Data

View counts, pin/lock status, vote counts, and hidden status are
currently Supabase-only and lost on full recovery. Plan to persist
these on a web3 service (IPFS, Ceramic, or custom onchain storage)
so they survive recovery. This is post-Phase 10 work.

| Data | Current storage | Future storage |
|---|---|---|
| View counts | Supabase only | Web3 service TBD |
| Pin/lock status | Supabase only | Web3 service TBD |
| Vote counts | Lens reactions (partial) | Web3 service TBD |
| Hidden status | Supabase only | Web3 service TBD |
