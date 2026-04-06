# Phase 6: Publish Flow — Threads & Replies

## Goal

Make the "Create Topic" and "Post Reply" buttons actually work.
When a user writes something in the composer and clicks submit,
it should:
1. Publish to Lens Protocol (permanent, onchain)
2. Save to our Supabase database (fast display)
3. Show up on the forum immediately

## Depends On

- Phase 2 ✅ (Groups + Feeds exist onchain)
- Phase 5 ✅ (Composer UI works, submit button exists but does nothing)

---

## CRITICAL DESIGN RULE

From CoreConceptV5.md:
> NOT used: `commentOn`, Lens native comments, per-user blogs/feeds.

Every post — whether it starts a thread or replies to one — is a
**standalone Lens article**. On Lens, they all look the same. The
thread structure (which reply belongs to which thread) exists ONLY
in our Supabase database.

---

## How Fountain Already Does This

Fountain publishes articles via `src/lib/publish/publish-post.ts`.
Our forum publish does the SAME thing with minor differences:

```
FOUNTAIN:                           FORUM:
1. Get user info                    1. Get user info (same)
2. Convert to markdown              2. Convert to markdown (same)
3. Build metadata attributes        3. Build attributes (different keys)
4. Create article metadata          4. Create article metadata (same)
5. Upload to Grove storage          5. Upload to Grove (same)
6. Get blog's feed address          6. Get forum feed address (different)
7. Publish to Lens                  7. Publish to Lens (same, NO commentOn)
8. Sign with wallet                 8. Sign with wallet (same)
9. Save to Supabase `posts` table   9. Save to Supabase `forum_threads` table
```

The only real differences are steps 3, 6, and 9. Everything else is
identical. We reuse Fountain's functions directly.

### Files to study before coding:

| Fountain file | What to learn from it |
|---|---|
| `src/lib/publish/publish-post.ts` | The full pipeline — our code follows this |
| `src/components/editor/addons/editor-autosave.tsx` line 37 | How to get markdown from the editor |
| `src/lib/publish/get-post-attributes.ts` | How to build metadata attributes |
| `src/lib/lens/storage-client.ts` | Grove upload — we use this as-is |
| `src/lib/auth/get-user-profile.ts` | Get user address + username — as-is |

### The markdown problem (solved)

Lens requires a `content` field with at least 1 character of markdown.
Fountain gets markdown from the editor using:
```ts
const { api } = useEditorPlugin(MarkdownPlugin);
const markdown = api.markdown.serialize({ value: editor.children });
```

This ONLY works inside the Plate.js editor React context. You can't
call it from outside. Our `ForumEditor` component exposes this via
an `editorRef` callback that gives the composer both `getContentJson()`
and `getContentMarkdown()`.

---

## What's Different: Thread vs Reply

Both are standalone Lens articles. The only differences:

| | Thread (new topic) | Reply |
|---|---|---|
| Metadata attribute | `forumCategory: "beginners"` | `forumThreadId: "pub-id-of-root"` |
| Supabase table | `forum_threads` | `forum_thread_replies` |
| API route | `POST /api/forum/threads` | `POST /api/forum/replies` |
| Lens `post()` call | Identical | Identical (NO commentOn) |
| Feed | From category config | Same feed as the thread |

---

## Execution Steps

### Step 6.1: ForumDraft Type ✅ DONE
**File:** `src/lib/forum/types.ts`

A lightweight type for what the publish functions need:
- `title` — thread title (empty for replies)
- `contentJson` — Plate.js editor JSON
- `contentMarkdown` — markdown text for Lens metadata
- `tags` — optional tags

### Step 6.2: Publish Thread Service ✅ DONE
**File:** `src/lib/forum/publish-thread.ts`

What it does:
1. Validates the category exists
2. Gets the logged-in user's info
3. Builds Lens metadata with `forumCategory` attribute
4. Uploads metadata to Grove → gets a `contentUri`
5. Publishes to Lens on the correct feed (commons or research)
6. Waits for the transaction to confirm
7. Fetches the created post to get its ID
8. Calls our API to save it in Supabase

### Step 6.3: Thread Tracking API ✅ DONE
**File:** `src/app/api/forum/threads/route.ts`

Server-side endpoint that:
1. Receives the publication data from the client
2. Inserts a row into `forum_threads` (with content_json for fast rendering)
3. Increments the category's thread count

### Step 6.4: Publish Reply Service ✅ DONE
**File:** `src/lib/forum/publish-reply.ts`

Same as thread publishing but:
- Uses `forumThreadId` attribute (not `forumCategory`)
- Calls `/api/forum/replies` (not `/api/forum/threads`)
- NO `commentOn` — it's a standalone article

### Step 6.5: Reply Tracking API ✅ DONE
**File:** `src/app/api/forum/replies/route.ts`

Server-side endpoint that:
1. Finds the parent thread by `root_publication_id`
2. Calculates position (reply_count + 1)
3. Inserts a row into `forum_thread_replies`
4. Updates the thread's reply_count and last_reply_at

### Step 6.6: Wire Composer Submit ✅ DONE
**File:** `src/components/forum/composer-panel.tsx`

The submit button now:
- Gets content JSON + markdown from the editor via `editorRef`
- In thread mode: reads category from URL, calls `publishThread()`
- In reply mode: uses threadRef from composer state, calls `publishReply()`
- Shows loading toast during publish
- On success: closes composer, navigates to thread, refreshes page
- On failure: shows error toast, keeps composer open

### Step 6.7: Join Groups Before First Post
**Status:** Not yet done

User must be a member of the group that gates the feed. Since our
groups are open (no approval needed), `joinGroup()` is instant.
If publishing fails with a group error, we need to auto-join.

### Step 6.8: Test End-to-End
**Status:** Not yet done

---

## What Gets Created on Lens

```
Publication A (thread root — standalone article)
  ├─ feed: COMMONS_FEED
  └─ metadata.attributes:
       forumCategory: "beginners"
       contentJson: { ... plate.js json ... }

Publication B (reply — also standalone article)
  ├─ feed: COMMONS_FEED
  └─ metadata.attributes:
       forumThreadId: "A"          ← points to root's ID
       contentJson: { ... plate.js json ... }
```

On Lens/Hey.xyz: A and B look like independent articles.
On our forum: B is reply #1 in thread A (Supabase knows this).

---

## How Recovery Works (If Supabase Dies)

Read all posts from the feed. Check metadata attributes:
- Has `forumCategory`? → It's a thread root
- Has `forumThreadId`? → It's a reply (value = root's publication ID)
- Order replies by timestamp → reconstruct positions

No `commentOn` needed. Pure metadata attributes.

---

## Files Created

```
src/lib/forum/types.ts                 ✅ ForumDraft interface
src/lib/forum/publish-thread.ts        ✅ Thread publish pipeline
src/lib/forum/publish-reply.ts         ✅ Reply publish pipeline
src/app/api/forum/threads/route.ts     ✅ Thread tracking API
src/app/api/forum/replies/route.ts     ✅ Reply tracking API
src/components/forum/composer-panel.tsx ✅ Updated with publish wiring
src/components/forum/forum-editor.tsx   ✅ Updated with editorRef for markdown
```

## Post-Completion Fix: Lens Display Mode

After Phase 7, we discovered that full content was leaking to other
apps' feeds. Fixed by using Fountain's "title_link" distribution mode:

```ts
// Instead of: content: draft.contentMarkdown
// We use:     content: `${draft.title} — https://forum.societyprotocol.io`
```

This makes other apps show just a title + link, not the full text.
The actual content is still in `contentJson` attribute and Grove.
See `LEARNING/12-LENS-DISPLAY-MODE.md` for full explanation.

---

## Acceptance Tests

| # | Test | Expected Result | Status |
|---|---|---|---|
| T6.1 | Open composer, write, submit | Thread published to Lens | ⬜ |
| T6.2 | Check Hey.xyz | Post visible with your app name | ⬜ |
| T6.3 | Check `forum_threads` table | Row with correct category | ⬜ |
| T6.4 | Check `forum_categories` thread_count | Incremented | ⬜ |
| T6.5 | Check `content_json` column | Plate.js JSON stored | ⬜ |
| T6.6 | Navigate to `/thread/[id]` | New thread renders | ⬜ |
| T6.7 | Reply via composer | Reply published as standalone | ⬜ |
| T6.8 | Check `forum_thread_replies` | Row with correct position | ⬜ |
| T6.9 | Thread `reply_count` | Incremented | ⬜ |
| T6.10 | Thread `last_reply_at` | Updated | ⬜ |
| T6.11 | Refresh thread page | New reply appears | ⬜ |
| T6.12 | `forumCategory` on Lens | Present in metadata | ⬜ |
| T6.13 | `forumThreadId` on Lens | Present in reply metadata | ⬜ |
| T6.14 | Reply has NO `commentOn` | Standalone article | ⬜ |
