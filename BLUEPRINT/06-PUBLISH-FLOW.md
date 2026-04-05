# Phase 6: Publish Flow — Threads & Replies (UPDATED)

## Goal

Wire the composer's "Create Topic" and "Post Reply" buttons to actually
publish. Every post (thread root OR reply) is a standalone Lens article
published to the same feed. Thread structure is tracked ONLY in Supabase.
NO `commentOn`. NO Lens-level linking.

## Depends On

- Phase 2 ✅ (feeds exist onchain)
- Phase 5 ✅ (composer UI exists, submit button logs to console)

---

## CRITICAL DESIGN RULE

From CoreConceptV5.md:
> NOT used: `commentOn`, Lens native comments, per-user blogs/feeds.
> No `commentOn`. No Lens-level linking. Thread structure is pure Supabase.

Every reply is a **standalone Lens publication**. On Lens, a reply looks
identical to a thread root — just another article in the feed. The only
difference is that Supabase knows it belongs to a thread (via `thread_id`
foreign key in `forum_thread_replies`).

Recovery uses the `forumThreadId` metadata attribute to reconstruct
thread membership — NOT `commentOn` relationships.

---

## What We Reuse From Fountain

### Publishing pipeline (from `publish-post.ts`):
1. `getUserAccount()` → get address + username from Lens session
2. `article({ title, content, locale, tags, attributes })` → Lens metadata
3. `storageClient.uploadAsJson(metadata)` → upload to Grove → `contentUri`
4. `post(lens, { contentUri, feed })` → publish to Lens (NO commentOn)
5. `handleOperationWith(walletClient)` → sign with wallet
6. `lens.waitForTransaction` → wait for confirmation
7. `fetchPost(lens, { txHash })` → get the created post

### Key imports:
- `storageClient` from `@/lib/lens/storage-client`
- `article` from `@lens-protocol/metadata`
- `post`, `fetchPost` from `@lens-protocol/client/actions`
- `handleOperationWith` from `@lens-protocol/client/viem`
- `getLensClient` from `@/lib/lens/client`
- `getUserAccount` from `@/lib/auth/get-user-profile`

### Markdown serialization:
`MarkdownPlugin` from `@udecode/plate-markdown` provides
`api.markdown.serialize({ value: editor.children })`.
We use this to convert Plate.js JSON → markdown for the Lens `content` field.

---

## Execution Order

### Step 6.1: Create ForumDraft Type
**File:** `src/lib/forum/types.ts`

```ts
export interface ForumDraft {
  title: string;
  contentJson: any;          // Plate.js JSON (editor.children)
  contentMarkdown: string;   // Markdown for Lens metadata
  tags?: string[];
}
```

### Step 6.2: Create Publish Thread Service
**File:** `src/lib/forum/publish-thread.ts`

```
Input:  ForumDraft + category slug + walletClient
Output: { success: true, publicationId } or { success: false, error }

Pipeline:
1. getCategoryBySlug(category) → validate + get feed type
2. getLensClient() → get session client
3. getUserAccount() → get address + username
4. Build attributes: [contentJson, forumCategory]
5. article({ title, content: markdown, locale, tags, attributes })
6. storageClient.uploadAsJson(metadata) → contentUri
7. FEED_MAP[cat.feed] → feed address
8. post(lens, { contentUri, feed })  ← NO commentOn
9. handleOperationWith(walletClient) → sign
10. lens.waitForTransaction → txHash
11. fetchPost(lens, { txHash }) → publicationId
12. POST /api/forum/threads → track in Supabase
```

### Step 6.3: Create Thread Tracking API Route
**File:** `src/app/api/forum/threads/route.ts`

```
POST /api/forum/threads
Body: { publicationId, contentUri, feed, category, title, summary,
        contentText, contentJson, authorAddress, authorUsername }

1. createClient() (server client)
2. INSERT into forum_threads (including content_json)
3. RPC forum_add_thread_to_category(category)
4. Return { success: true }
```

### Step 6.4: Create Publish Reply Service
**File:** `src/lib/forum/publish-reply.ts`

```
Input:  ForumDraft + threadRootPublicationId + feed + walletClient
Output: { success: true, publicationId } or { success: false, error }

Pipeline — SAME as thread, but:
- Attribute: forumThreadId (instead of forumCategory)
- post(lens, { contentUri, feed })  ← SAME call, NO commentOn
- Tracks via POST /api/forum/replies (not /api/forum/threads)
```

The reply is published as a standalone article to the SAME feed as the
thread root. On Lens, it's indistinguishable from a root post. Only
Supabase knows it's a reply (via thread_id + position).

### Step 6.5: Create Reply Tracking API Route
**File:** `src/app/api/forum/replies/route.ts`

```
POST /api/forum/replies
Body: { threadRootPublicationId, publicationId, contentUri,
        contentText, contentJson, summary, authorAddress, authorUsername }

1. Find thread by root_publication_id
2. position = reply_count + 1
3. INSERT into forum_thread_replies
4. RPC forum_add_reply(thread_id, now())
5. Return { success: true, position }
```

### Step 6.6: Wire Composer Submit Button
Update `src/components/forum/composer-panel.tsx`:
- Thread mode: calls `publishThread()` with title, category (from URL),
  editor content, walletClient
- Reply mode: calls `publishReply()` with editor content, threadRef, walletClient
- On success: close composer, refresh page, toast
- On failure: keep composer open, error toast

### Step 6.7: Join Groups Before First Post
User must join the group that gates the feed. Since groups are open,
`joinGroup()` is instant. Auto-join on first post attempt.

### Step 6.8: Test End-to-End

---

## Onchain Result After Publishing

```
Publication A (thread root)
  ├─ feed: COMMONS_FEED
  ├─ metadata.attributes: [forumCategory: "beginners", contentJson: {...}]
  └─ NO commentOn — standalone article

Publication B (reply to thread A)
  ├─ feed: COMMONS_FEED
  ├─ metadata.attributes: [forumThreadId: "A", contentJson: {...}]
  └─ NO commentOn — standalone article (looks same as A on Lens)

Publication C (another reply to thread A)
  ├─ feed: COMMONS_FEED
  ├─ metadata.attributes: [forumThreadId: "A", contentJson: {...}]
  └─ NO commentOn — standalone article
```

On Lens/Hey.xyz: A, B, C all look like independent articles.
On our forum: B and C are replies #1 and #2 in thread A (Supabase knows).

---

## Recovery (How Thread Structure Survives Without commentOn)

If Supabase is lost, recovery reads the `forumThreadId` attribute:
- Posts with `forumCategory` attribute → thread roots
- Posts with `forumThreadId` attribute → replies (value = root's publication ID)
- Order replies by timestamp → reconstruct positions

This is the "belt and suspenders" approach from CoreConceptV5.

---

## Files to Create

```
src/lib/forum/types.ts                    — ForumDraft interface
src/lib/forum/publish-thread.ts           — thread publish pipeline
src/lib/forum/publish-reply.ts            — reply publish pipeline
src/app/api/forum/threads/route.ts        — thread tracking API
src/app/api/forum/replies/route.ts        — reply tracking API
```

## Files to Update

```
src/components/forum/composer-panel.tsx    — wire submit to publish functions
```

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T6.1 | Open composer, write content, submit | Thread published to Lens |
| T6.2 | Check Hey.xyz | Post visible with your app name |
| T6.3 | Check `forum_threads` table | Row exists with correct category |
| T6.4 | Check `forum_categories` thread_count | Incremented by 1 |
| T6.5 | Check `content_json` column | Plate.js JSON stored |
| T6.6 | Navigate to `/thread/[id]` | New thread renders |
| T6.7 | Open reply composer, submit | Reply published as standalone article |
| T6.8 | Check `forum_thread_replies` table | Row with correct position |
| T6.9 | Thread `reply_count` updated | Incremented |
| T6.10 | Thread `last_reply_at` updated | Set to reply time |
| T6.11 | Refresh thread page | New reply appears |
| T6.12 | `forumCategory` attribute on Lens | Present in thread metadata |
| T6.13 | `forumThreadId` attribute on Lens | Present in reply metadata |
| T6.14 | Reply has NO `commentOn` on Lens | Standalone article, not a comment |
