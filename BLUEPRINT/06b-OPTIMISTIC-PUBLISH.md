# Phase 6b: Optimistic Publishing

## Goal

Make posts appear instantly after clicking "Create Topic" or "Post Reply".
The onchain publication happens in the background. Users don't wait.

## Depends On

Phase 6 ✅ (current publish flow works end-to-end)

---

## Why This Matters

Current UX: User clicks publish → stares at "Publishing..." for 10-20
seconds → post finally appears. This feels broken for a forum where
people expect instant responses.

Target UX: User clicks publish → post appears in 1 second with gray
"Pending" badge → badge turns green when Lens confirms → user was
never blocked.

---

## What Changes (and What Doesn't)

### Nothing changes:
- Database schema (no new columns, no migrations)
- Onchain badge component (already handles pending vs onchain)
- Forum pages (already render from Supabase)
- Thread detail page (already reads content_json from Supabase)
- API routes for reading data (get-threads, get-thread-detail)

### What changes:

**1. `publish-thread.ts` → split into two functions**

Currently one function does everything sequentially:
```
publishThread() = Grove + Lens + Supabase (all in one, 15 sec)
```

Becomes:
```
saveThread()    = Supabase only (instant, uses temp ID)
publishToLens() = Grove + Lens + update Supabase (background, 15 sec)
```

**2. `publish-reply.ts` → same split**

**3. `composer-panel.tsx` → calls save first, then background publish**

Currently:
```ts
const result = await publishThread(draft, category, walletClient);
// waits 15 seconds...
if (result.success) { close(); navigate(); }
```

Becomes:
```ts
const tempId = await saveThread(draft, category);
close(); navigate(`/thread/${tempId}`);
// don't await — fire and forget
publishToLens(tempId, draft, category, walletClient);
```

**4. New API route: `PATCH /api/forum/threads`**

Updates a thread's `root_publication_id` from temp ID to real Lens ID.

---

## Detailed Steps

### Step 6b.1: Save Thread to Supabase (instant)

New function in `publish-thread.ts`:

```ts
async function saveThread(draft, category, authorAddress, authorUsername) {
  const tempId = `pending-${crypto.randomUUID()}`;

  await fetch("/api/forum/threads", {
    method: "POST",
    body: JSON.stringify({
      publicationId: tempId,        // temporary!
      contentUri: null,             // not uploaded yet
      feed: category.feed,
      category: category.slug,
      title: draft.title,
      summary: draft.contentMarkdown.slice(0, 200),
      contentText: draft.contentMarkdown,
      contentJson: draft.contentJson,
      authorAddress,
      authorUsername,
    }),
  });

  return tempId;
}
```

This is the same API route we already have — it just receives a temp ID
instead of a real Lens publication ID. No API changes needed.

### Step 6b.2: Publish to Lens in Background

New function in `publish-thread.ts`:

```ts
async function publishThreadToLens(tempId, draft, category, walletClient) {
  // Same Lens publish pipeline as before:
  // 1. Build metadata with forumCategory attribute
  // 2. Upload to Grove → contentUri
  // 3. post(lens, { contentUri, feed })
  // 4. handleOperationWith(walletClient)
  // 5. waitForTransaction
  // 6. fetchPost → get real publication ID

  // Then update Supabase:
  await fetch("/api/forum/threads", {
    method: "PATCH",
    body: JSON.stringify({
      tempId,
      realPublicationId: result.publicationId,
      contentUri,
    }),
  });
}
```

### Step 6b.3: Update Composer Submit

```ts
// Before (current):
const result = await publishThread(draft, category, walletClient);
if (result.success) { close(); router.push(`/thread/${result.publicationId}`); }

// After (optimistic):
const { tempId } = await saveThread(draft, category);
close();
router.push(`/thread/${tempId}`);
// Background — no await
publishThreadToLens(tempId, draft, category, walletClient)
  .catch((err) => toast.error(`Onchain publish failed: ${err.message}`));
```

### Step 6b.4: PATCH API Route

New handler in `src/app/api/forum/threads/route.ts`:

```ts
export async function PATCH(req) {
  const { tempId, realPublicationId, contentUri } = await req.json();
  const db = await createClient();

  await db.from("forum_threads")
    .update({
      root_publication_id: realPublicationId,
      content_uri: contentUri,
    })
    .eq("root_publication_id", tempId);

  return NextResponse.json({ success: true });
}
```

### Step 6b.5: Same for Replies

Identical pattern for `publish-reply.ts` — save to Supabase first
with temp ID, publish to Lens in background, update when confirmed.

---

## Edge Cases

| Case | Handling |
|---|---|
| Lens publish fails | Post stays with "Pending" badge. User sees error toast. Can retry later. |
| User navigates away during background publish | Publish continues — it's a fire-and-forget fetch. But if user closes the tab, it's lost. |
| User closes tab before Lens confirms | Post exists in Supabase with temp ID. "Pending" badge stays gray. Need a retry mechanism (Phase 9 sync can catch this). |
| Two posts with same temp ID | UUID makes this virtually impossible. |

### The tab-close problem

If the user closes the browser tab while Lens is still processing,
the background publish dies. The post stays in Supabase with a temp ID
forever. Solutions:

**Option A (simple):** Accept it. The post is visible on the forum.
The "Pending" badge stays gray. Phase 9's sync script can detect
posts with `pending-` IDs and retry the Lens publish.

**Option B (robust):** Use a service worker or server-side queue.
Much more complex. Not worth it for MVP.

**Recommendation:** Option A. The sync script (Phase 9) already scans
for missing publications. We just add: "if root_publication_id starts
with 'pending-', retry the Lens publish."

---

## Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Wallet popup appears after composer closes | Medium | The wallet sign request still needs user approval. We may need to get the signature BEFORE closing the composer. |
| Background publish silently fails | Low | Error toast + sync script catches it |
| Temp IDs in URLs look ugly | Low | Redirect to real ID after Lens confirms |

### The wallet popup problem

This is the biggest risk. `handleOperationWith(walletClient)` triggers
a wallet popup for the user to sign. If the composer is already closed
and the user is reading the thread, a random wallet popup appears.

**Solutions:**

**A. Sign before closing (recommended):** Get the wallet signature
while the composer is still open (user expects it), THEN close the
composer and save to Supabase, THEN send the signed transaction to
Lens in the background.

```
1. User clicks Publish
2. Wallet popup → user signs (composer still open)
3. Save to Supabase with temp ID (instant)
4. Close composer, show post
5. Background: send signed tx to Lens, wait, update Supabase
```

This is the best UX — the wallet popup happens when expected (during
publish), and the post appears right after signing.

**B. Sign everything upfront:** Not possible with Lens SDK — the
transaction is built and signed in one step.

---

## Revised Flow (with wallet sign first)

```
1. User clicks "Create Topic"
2. Build metadata + upload to Grove              (1-2 sec, show "Uploading...")
3. Wallet popup → user signs the Lens transaction (user action)
4. Save to Supabase with temp ID                 (instant)
5. Close composer, navigate to thread             (instant)
6. Post visible with gray "Pending" badge
7. Background: send signed tx to Lens             (5-15 sec)
8. Background: update Supabase with real ID       (instant)
9. Badge turns green "Onchain"
```

User wait: steps 1-5 = ~3-5 seconds (mostly the wallet popup).
Background: steps 6-9 = user doesn't wait.

This is a good compromise — the slow part (Lens confirmation) happens
in the background, but the wallet sign happens while the user expects it.

---

## Implementation Complexity

| Step | Effort | Risk |
|---|---|---|
| 6b.1: saveThread function | Small — extract existing code | Low |
| 6b.2: background publish function | Medium — split existing code | Medium (wallet timing) |
| 6b.3: update composer submit | Small — reorder calls | Low |
| 6b.4: PATCH API route | Small — one new handler | Low |
| 6b.5: same for replies | Small — copy thread pattern | Low |

**Total effort:** ~1-2 hours of coding.
**Total risk:** Medium (wallet popup timing needs testing).

---

## Recommendation

**Do it after Phase 7, before Phase 10.** Here's why:

- It's a UX improvement, not a functional requirement
- The current flow works — it's just slow
- Phase 7 (voting, moderation) adds more features that benefit from
  the current simpler flow
- The wallet popup timing needs careful testing
- Phase 9 (sync) provides the safety net for failed background publishes

Alternatively, if the 15-second wait really bothers you, we can do it
now — it's ~1-2 hours of work and the plan is clear.
