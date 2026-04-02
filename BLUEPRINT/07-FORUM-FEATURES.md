# Phase 7: Forum Features — Voting, Moderation, Quote-Reply

## Goal

Add interactive features: voting on posts, moderator tools, quote-reply
insertion, and group membership management. By the end, the forum has
full interactivity beyond just reading and writing.

## Depends On

Phase 6 (threads and replies can be published)

---

## Feature 1: Voting

### Hook: `src/hooks/forum/use-forum-vote.ts`

Dual-write: Lens reactions (onchain truth) + Supabase `forum_votes` (speed layer).

```ts
interface UseForumVoteReturn {
  score: number           // upvotes - downvotes
  userVote: 1 | -1 | null
  isLoading: boolean
  upvote: () => void
  downvote: () => void
}
```

Flow:
1. On mount: check user's existing vote from Supabase
2. On vote: optimistic UI update → Lens `addReaction`/`undoReaction` → sync to Supabase
3. Toggle: voting same direction again removes the vote

### API: `src/app/api/forum/votes/route.ts`

- GET: check user's vote on a publication
- POST: apply vote via `forum_apply_vote` RPC

### Integration

Wire into `forum-post-card.tsx` — replace static vote buttons with
`useForumVote` hook. Show active state (colored arrow) when user has voted.

---

## Feature 2: Moderation

### Hook: `src/hooks/forum/use-is-moderator.ts`

Checks if current user is admin of either Commons or Research group.
Uses `fetchAdminsFor()` from Lens SDK.

### Hook: `src/hooks/forum/use-hide-reply.ts`

Calls Lens `hideReply()` + marks `is_hidden = true` in Supabase.

### API: `src/app/api/forum/replies/[publicationId]/hide/route.ts`

POST: sets `is_hidden = true` on the reply row.

### Hook: `src/hooks/forum/use-thread-moderation.ts`

Pin/unpin and lock/unlock threads. Supabase-only operations (no Lens equivalent).

### API: `src/app/api/forum/threads/[id]/moderate/route.ts`

PATCH: updates `is_pinned` or `is_locked` on thread row. Admin-only.

### UI: Moderator Actions

Conditionally render mod buttons on post cards and thread headers when
`useIsModerator()` returns true:
- Post card: "Hide" button
- Thread header: "Pin/Unpin", "Lock/Unlock" buttons

---

## Feature 3: Quote-Reply

### Basic Quote-Reply (Phase 7)

Each post in a thread has a 💬 Reply button. Clicking it:
1. Opens the composer in reply mode (via `useComposer().openReply()`)
2. Inserts a blockquote at the top of the editor with the quoted text

In Plate.js terms, this inserts:
```json
[
  { "type": "blockquote", "children": [
    { "type": "p", "children": [{ "text": "Quoted text from the post" }] },
    { "type": "p", "children": [{ "text": "— @username, #3" }] }
  ]},
  { "type": "p", "children": [{ "text": "" }] }
]
```

### Text-Selection Quoting (Future Enhancement)

User selects text in a post → floating "Quote" button appears above
selection → clicking it opens composer with just that selection quoted.

This is pure DOM selection + Plate.js insertion. Implementation:
1. Listen for `mouseup` events on post content
2. Check if `window.getSelection()` has a range
3. Show floating button positioned above selection
4. On click: extract selected text, open composer with quote

**Defer this to after Phase 7 MVP.** The basic reply button is sufficient.

---

## Feature 4: Group Membership

### Hook: `src/hooks/forum/use-join-group.ts`

Calls `joinGroup()` from Lens SDK. For MembershipApprovalGroupRule,
this sends a join request (not instant membership).

### Hook: `src/hooks/forum/use-membership-management.ts`

Admin-only. Approve/deny pending requests, remove members, ban/unban.
Uses: `approveGroupMembershipRequests`, `removeGroupMembers`,
`banGroupAccounts`, `unbanGroupAccounts`.

### UI: Membership Gate

On board pages, if user is not a member of the required group:
- Show "Join Community" button instead of "New Thread"
- After clicking: "Request sent! Waiting for approval."
- Thread list is still readable (public read)

---

## Feature 5: Notifications

### Hook: `src/hooks/forum/use-notifications.ts`

Wraps Lens `fetchNotifications()` filtered to forum feeds:
```ts
filter: {
  feeds: [
    { feed: evmAddress(COMMONS_FEED_ADDRESS) },
    { feed: evmAddress(RESEARCH_FEED_ADDRESS) },
  ],
}
```

### Page: `src/app/notifications/page.tsx`

List of notification items. Port notification renderer components from
Fountain's existing `src/components/notifications/` — they render Lens
Notification objects which are the same regardless of app.

---

## Feature 6: User Forum Activity

### Data: `src/lib/forum/get-user-forum-activity.ts`

Query `forum_threads` and `forum_thread_replies` by `author_address`.
Returns recent threads started and replies posted.

### UI: Forum Activity Tab on Profile

Add a "Forum Activity" section to the user profile page (`/u/[user]`).
Shows threads started and recent replies with links to thread pages.

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T7.1 | Click upvote on a post | Score increases, arrow turns active |
| T7.2 | Click upvote again | Vote removed, score decreases |
| T7.3 | Click downvote after upvoting | Vote flips, score changes by 2 |
| T7.4 | Vote without login | Error toast: "Please log in" |
| T7.5 | Check `forum_votes` table after voting | Row exists with correct direction |
| T7.6 | Moderator sees "Hide" button on replies | Button visible |
| T7.7 | Non-moderator does NOT see "Hide" button | Button hidden |
| T7.8 | Moderator hides a reply | Reply disappears from thread |
| T7.9 | Moderator pins a thread | Thread appears first in list with 📌 |
| T7.10 | Moderator locks a thread | Reply editor hidden, 🔒 icon shown |
| T7.11 | Click Reply on a post | Composer opens with quoted text |
| T7.12 | Quoted text appears as blockquote in editor | Formatted correctly |
| T7.13 | Non-member clicks "New Thread" | Sees "Join Community" prompt |
| T7.14 | Member requests to join group | Request sent, toast confirms |
| T7.15 | Admin approves membership request | User can now post |
| T7.16 | Notifications page shows forum activity | Replies, reactions visible |
| T7.17 | Profile page shows forum activity | Threads and replies listed |

## Files Created

```
src/hooks/forum/use-forum-vote.ts
src/hooks/forum/use-is-moderator.ts
src/hooks/forum/use-hide-reply.ts
src/hooks/forum/use-thread-moderation.ts
src/hooks/forum/use-join-group.ts
src/hooks/forum/use-membership-management.ts
src/hooks/forum/use-notifications.ts
src/lib/forum/get-user-forum-activity.ts
src/app/api/forum/votes/route.ts
src/app/api/forum/replies/[publicationId]/hide/route.ts
src/app/api/forum/threads/[id]/moderate/route.ts
```
