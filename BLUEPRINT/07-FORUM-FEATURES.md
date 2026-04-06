# Phase 7: Forum Features — Hearts, Moderation, Quote-Reply (UPDATED)

## Goal

Add interactivity to the forum: heart reactions, moderator tools, and
quote-reply. By the end, users can react to posts, moderators can
manage content, and replies can quote specific posts.

## Depends On

Phase 6 ✅ (threads and replies can be published)

---

## Fountain Code to Study First

| Feature | Fountain file | What to learn |
|---|---|---|
| Reactions | `src/hooks/use-post-actions.ts` lines 180-205 | `addReaction` / `undoReaction` with optimistic UI |
| Admin check | `src/hooks/use-admin-status.ts` | How to check if user is admin via JWT claims |
| Admin middleware | `src/lib/auth/admin-middleware.ts` | Server-side admin check for API routes |
| Admin UI | `src/components/admin/admin-auth-check.tsx` | Conditional rendering for admin-only UI |
| Notifications | `src/components/notifications/` (entire folder) | Already works — just needs feed filtering |
| Post reactions UI | `src/components/post/post-reactions.tsx` | How Fountain renders the heart/like button |

---

## DESIGN DECISIONS (from what we learned)

1. **Hearts only, no downvotes.** Fountain uses `PostReactionType.Upvote`
   only. No downvote. Our forum does the same — a heart, not arrows.

2. **Supabase vote tracking simplified.** The `forum_apply_vote` function
   with direction flip logic is overkill. We only need: heart on / heart off.
   But the table and function already exist, so we use direction=1 only.

3. **Groups are open.** No membership approval flow needed. `joinGroup()`
   is instant. Feature 4 from the old plan is mostly removed.

4. **Notifications already work.** Fountain's notification system is
   functional. We just filter to our forum feeds. Minimal new code.

5. **Quote-reply needs composer changes.** The composer must accept
   pre-filled quoted text when opening in reply mode.

---

## Features (in execution order)

### Feature 1: Heart Reactions
### Feature 2: Moderation (pin, lock, hide)
### Feature 3: Quote-Reply

Features 4-6 from the old plan (group membership, notifications, user
activity) are deferred or already working.

---

## Feature 1: Heart Reactions

### How Fountain does it (study first)

`src/hooks/use-post-actions.ts` line 180-205:
```ts
// Optimistic update first
updatePostOperations(post.id, { hasUpvoted: !currentlyLiked });
updatePostStats(post.id, { upvotes: currentlyLiked ? count - 1 : count + 1 });

// Then Lens call
if (currentlyLiked) {
  await undoReaction(lens, { post: post.id, reaction: PostReactionType.Upvote });
} else {
  await addReaction(lens, { post: post.id, reaction: PostReactionType.Upvote });
}
```

Pattern: optimistic UI update → Lens API call → revert on error.

### What we build

**Hook:** `src/hooks/forum/use-forum-heart.ts`

Simpler than Fountain's `usePostActions` (which handles bookmarks,
comments, collects, etc.). We only need heart on/off.

```ts
interface UseForumHeartReturn {
  count: number;
  hasHearted: boolean;
  isLoading: boolean;
  toggleHeart: () => void;
}
```

Flow:
1. Read initial state: `upvotes` from props, `hasHearted` from Lens post operations
2. On click: optimistic UI update (instant)
3. Call Lens `addReaction` or `undoReaction`
4. On error: revert the optimistic update

**No Supabase vote tracking for MVP.** Lens reactions are the source of
truth. The `forum_votes` table exists but we skip the dual-write for now.
Simpler = fewer bugs. We can add Supabase vote caching later if needed
for performance.

### Integration

Update `forum-post-card.tsx`:
- Replace static heart button with `useForumHeart` hook
- Heart fills red when active
- Count shows next to heart

### Step 7.1: Create heart hook
### Step 7.2: Wire into post card

---

## Feature 2: Moderation

### How Fountain does it (study first)

**Admin check (client):** `src/hooks/use-admin-status.ts`
```ts
const claims = getTokenClaims(appToken);
setIsAdmin(!!claims?.metadata?.isAdmin);
```
Reads the `isAdmin` flag from the JWT token. No Lens API call needed.

**Admin check (server):** `src/lib/auth/is-admin.ts`
Checks if an address is in the admin list.

**Admin middleware:** `src/lib/auth/admin-middleware.ts`
Wraps API routes to reject non-admin requests.

### What we build

**Three moderator actions (Supabase only, no Lens calls):**

1. **Pin/Unpin thread** — toggle `is_pinned` on `forum_threads`
2. **Lock/Unlock thread** — toggle `is_locked` on `forum_threads`
3. **Hide reply** — set `is_hidden = true` on `forum_thread_replies`

All are simple Supabase UPDATE operations. Admin-only.

**Hook:** `src/hooks/forum/use-is-moderator.ts`

Reuses Fountain's pattern — read `isAdmin` from JWT claims.
No need to call Lens `fetchAdminsFor()` (that was the old plan's
approach, but Fountain already puts admin status in the JWT).

**API routes:**

`PATCH /api/forum/threads/[id]/moderate` — pin/lock (admin only)
`PATCH /api/forum/replies/[id]/moderate` — hide (admin only)

Both use Fountain's `adminMiddleware` pattern to verify admin status.

**UI:**

On thread header (if moderator):
- "📌 Pin" / "📌 Unpin" button
- "🔒 Lock" / "🔒 Unlock" button

On each reply (if moderator):
- "🗑 Hide" button

### Step 7.3: Create moderator check hook
### Step 7.4: Create moderation API routes
### Step 7.5: Add moderator UI to thread page

---

## Feature 3: Quote-Reply

### What needs to change

Currently: click "Reply" → composer opens empty in reply mode.
Want: click "Reply" → composer opens with the quoted post text.

### How it works

1. Each post card has a "Reply" button (already exists)
2. On click: extract the post's text content
3. Pass it to `openReply()` as `quotedText`
4. Composer opens with a blockquote pre-inserted

### Composer changes needed

The `useComposer` hook already has `quotedText` in the state interface
(we planned for this). But the `ForumEditor` doesn't currently accept
initial content from the composer.

Changes:
- `useComposer.openReply()` accepts optional `quotedText` parameter
- `ComposerPanel` passes `quotedText` as initial editor value
- Initial value is a Plate.js blockquote node

### Plate.js blockquote format

```json
[
  {
    "type": "blockquote",
    "children": [
      { "type": "p", "children": [{ "text": "The quoted text here" }] }
    ]
  },
  { "type": "p", "children": [{ "text": "" }] }
]
```

### Step 7.6: Update composer to accept quoted text
### Step 7.7: Update reply button to pass post content
### Step 7.8: Test quote-reply flow

---

## Execution Order

| Step | What | Effort |
|---|---|---|
| 7.1 | Create `use-forum-heart.ts` hook | Small |
| 7.2 | Wire heart into `forum-post-card.tsx` | Small |
| 7.3 | Create `use-is-moderator.ts` hook | Small |
| 7.4 | Create moderation API routes | Small |
| 7.5 | Add moderator UI to thread page | Medium |
| 7.6 | Update composer for quoted text | Medium |
| 7.7 | Update reply button to pass content | Small |
| 7.8 | Test everything | — |

---

## What's Deferred (from old Phase 7)

| Old feature | Why deferred |
|---|---|
| Group membership UI (join/leave) | Groups are open, join via script. Not needed for MVP. |
| Membership approval flow | No approval rule on groups. Not applicable. |
| Notifications filtering | Fountain's notifications already work. Filter to forum feeds is Phase 10 polish. |
| User forum activity tab | Nice-to-have. Phase 10 polish. |
| `forum_votes` Supabase tracking | Using Lens reactions directly. Add caching later if needed. |

---

## Files to Create

```
src/hooks/forum/use-forum-heart.ts           — heart reaction hook
src/hooks/forum/use-is-moderator.ts          — admin check from JWT
src/app/api/forum/threads/[id]/moderate/route.ts  — pin/lock API
src/app/api/forum/replies/[id]/moderate/route.ts  — hide API
```

## Files to Update

```
src/components/forum/forum-post-card.tsx     — wire heart + mod buttons
src/hooks/forum/use-composer.tsx             — accept quotedText
src/components/forum/composer-panel.tsx       — pass quoted text to editor
src/components/forum/reply-button.tsx         — pass post content
src/app/thread/[rootPublicationId]/page.tsx  — mod buttons on header
```

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T7.1 | Click heart on a post | Heart fills red, count increases |
| T7.2 | Click heart again | Heart unfills, count decreases |
| T7.3 | Heart without login | Error toast or no action |
| T7.4 | Moderator sees Pin/Lock/Hide buttons | Buttons visible |
| T7.5 | Non-moderator doesn't see mod buttons | Buttons hidden |
| T7.6 | Moderator pins a thread | Thread shows 📌, appears first in list |
| T7.7 | Moderator locks a thread | Reply button disabled, 🔒 shown |
| T7.8 | Moderator hides a reply | Reply disappears from thread |
| T7.9 | Click Reply on a post | Composer opens with quoted text |
| T7.10 | Quoted text shows as blockquote | Formatted correctly in editor |


---

## Completion Notes (2026-04-06)

### What Was Done
- Feature 1: Heart reactions with optimistic UI (Lens `addReaction`/`undoReaction`)
- Feature 2: Moderation (pin/lock threads, hide replies) — admin-only
- Feature 3: Quote-reply Level 1 (whole post text quoted as blockquote)

### Quote-Reply Levels

**Level 1 (done):** Click Reply → entire post text quoted as blockquote.
Simple, works now.

**Level 2 (future — see `PlanExecution/ComposerDiscourse.md`):**
Select specific text → floating "Quote" button appears → only selection
is quoted. Requires:
- DOM selection tracking (`window.getSelection()`)
- Floating UI positioning above selection
- Extract selected text range
- Insert only that text as blockquote

Reference: Discourse's implementation is in their `quote-button.gjs`
component. The `ComposerDiscourse.md` file has the reverse-engineered
UX spec. This is a significant feature that can be broken down from
the Discourse codebase later.

**Level 3 (future):** Quote notifications — notify the original author
when someone quotes their post. Requires a custom notification table
in Supabase (Lens notifications don't know about forum quotes).

### Tests Passed
| # | Test | Status |
|---|---|---|
| T7.1 | Click heart → fills red, count up | ✅ |
| T7.2 | Click again → unfills, count down | ✅ |
| T7.4 | Mod sees Pin/Lock/Hide | ✅ (if admin) |
| T7.5 | Non-mod doesn't see mod buttons | ✅ |
| T7.9 | Reply opens with quoted text | ✅ |
| T7.10 | Quote shows as blockquote | ✅ |
