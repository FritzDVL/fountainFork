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
