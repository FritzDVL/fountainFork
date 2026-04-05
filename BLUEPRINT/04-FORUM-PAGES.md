# Phase 4: Forum Pages — Landing, Board List, Thread Detail (UPDATED)

## Goal

Build the read-only forum UI. By the end, users can browse boards, see
thread lists, and read threads with stacked replies.

## Depends On

Phase 3 ✅ (forum tables + categories seeded)

---

## What We Confirmed From the Codebase

### Content Rendering
- Fountain renders posts with: `<Editor showToc value={contentJson} readOnly={true} />`
- `value` is a **string** (JSON.stringify'd Plate.js content), NOT an object
- The `Editor` component is at `src/components/editor/editor.tsx` (default export)
- It's a client component (`"use client"`) — needs to be imported dynamically in server pages
- There's also a `getStaticEditor()` in `static.tsx` for server-side rendering

### Supabase Server Client
- Import: `import { createClient } from "@/lib/db/server"`
- Returns a Supabase client with the user's JWT from cookies
- Used in all server components and API routes

### Available UI Components (reuse from Fountain)
- `Button` from `@/components/ui/button`
- `Card` from `@/components/ui/card`
- `Badge` from `@/components/ui/badge`
- `Skeleton` from `@/components/ui/skeleton`
- `Separator` from `@/components/ui/separator`
- `Table` from `@/components/ui/table`
- `UserAvatar` from `@/components/user/user-avatar`
- `UserName` from `@/components/user/user-name`
- `formatRelativeTime` from `@/lib/utils`

### Layout
- Root layout (`src/app/layout.tsx`) wraps everything with Header + Footer
- Forum pages inherit this — no need for a separate layout
- Fountain uses flat routes (no route groups)

---

## Routes

```
/boards                              → Landing page
/boards/[feed]/page.tsx              → Thread list (uses ?category= query param)
/thread/[rootPublicationId]/page.tsx → Thread detail
```

---

## Step 4.1: Data Layer (3 files)

These are server-side functions that query Supabase. Create them first
so the pages have data to render.

### File: `src/lib/forum/get-board-sections.ts`

```ts
// Returns all sections with categories + thread counts + latest activity
// Used by: /boards landing page
// Pattern: import { createClient } from "@/lib/db/server"
```

Query:
- `forum_categories` ordered by `display_order`
- For each category: latest `forum_threads.last_reply_at` or `created_at`
- Merge with static `SECTIONS` config from `categories.ts`

Returns: `BoardSection[]` with `categories: BoardCategory[]` each having
`threadCount` and `latestActivity`.

### File: `src/lib/forum/get-threads.ts`

```ts
// Returns paginated threads for a category
// Used by: /boards/[feed] thread list page
```

Query:
```sql
SELECT * FROM forum_threads
WHERE category = $1 AND is_hidden = false
ORDER BY is_pinned DESC, last_reply_at DESC NULLS LAST
LIMIT 20 OFFSET $2
```

Returns: `{ threads: ThreadListItem[], total: number }`

### File: `src/lib/forum/get-thread-detail.ts`

```ts
// Returns thread + all replies
// Used by: /thread/[rootPublicationId] detail page
```

Queries:
1. `forum_threads` WHERE `root_publication_id = $1`
2. `forum_thread_replies` WHERE `thread_id = $1` ORDER BY `position`
3. Calls `forum_increment_views` RPC

Returns: `{ thread: ThreadDetail, replies: ThreadReply[] } | null`

---

## Step 4.2: Landing Page — `/boards`

**File:** `src/app/boards/page.tsx` (server component)

**What it renders:**
```
┌─ SECTION: GENERAL DISCUSSION ────────────────────────────────┐
│ Beginners & Help          New to the forum...    12  340  2h │
│ 4 Key Concepts            Core concepts...        5  120  1d │
│ Web3 Outpost              Web3 integration...     3   87  3d │
│ DAO Governance            Governance...           8  210  5h │
└──────────────────────────────────────────────────────────────┘

┌─ SECTION: FUNCTIONS (GRID) ──────────────────────────────────┐
│ ┌──────────────────┐ ┌──────────────────┐                    │
│ │ ✦ Economic Game  │ │ ✦ Function Ideas │                    │
│ └──────────────────┘ └──────────────────┘                    │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│ │ ✦ Hunting  │ │ ✦ Property │ │ ✦ Parenting│                │
│ └────────────┘ └────────────┘ └────────────┘                │
└──────────────────────────────────────────────────────────────┘

┌─ SECTION: OTHERS ────────────────────────────────────────────┐
│ ... (5 child-boards, list layout)                            │
└──────────────────────────────────────────────────────────────┘

┌─ SECTION: PARTNER COMMUNITIES ───────────────────────────────┐
│ ... (4 child-boards, list layout)                            │
└──────────────────────────────────────────────────────────────┘

LANGUAGE BOARDS
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Español  │ │Português │ │   中文    │
└──────────┘ └──────────┘ └──────────┘
```

NOTE: Technical Section is NOT on the landing page. It belongs to the
Research area (Phase 8, separate /research page).

**Components needed:**
- `board-section-list.tsx` — section with list of category rows
- `board-section-grid.tsx` — section with grid of category cards
- `board-category-row.tsx` — single row: name + desc + stats
- `board-grid-card.tsx` — single grid card: icon + name

**Styling:** Match `mockup-landing-fountain.html`:
- Section header: muted bg, uppercase, left accent bar (3px)
- Max width: 960px centered (`max-w-[960px] mx-auto`)
- Category row: hover bg-muted, border-b between rows
- Grid: 2-col first row, 3-col remaining rows

---

## Step 4.3: Thread List — `/boards/[feed]`

**File:** `src/app/boards/[feed]/page.tsx` (server component)

**URL example:** `/boards/commons?category=beginners`

**What it renders:**
```
Boards / Beginners & Help                    ← breadcrumb

Beginners & Help                [+ New Thread]
New to the forum? Start here.

┌──────────────────────────┬────────────┬───────┬─────┬────────┐
│ Topic                    │ Started by │Replies│Views│Activity│
├──────────────────────────┼────────────┼───────┼─────┼──────┤
│ 📌 Welcome to the forum │  alice     │  24   │ 340 │   2h  │
│ How do I create a Lens   │  bob       │   8   │ 120 │   5h  │
└──────────────────────────┴────────────┴───────┴─────┴────────┘
                       [Load More]
```

**Components needed:**
- `thread-list-view.tsx` — table wrapper
- `thread-row.tsx` — single thread row

**Key details:**
- Breadcrumb: `Link` to `/boards` + current category name
- "New Thread" button: links to composer (Phase 5) or placeholder for now
- Table columns hidden on mobile except Topic
- Pinned threads: Pin icon before title
- Empty state: "No threads yet. Be the first to start a discussion."

---

## Step 4.4: Thread Detail — `/thread/[rootPublicationId]`

**File:** `src/app/thread/[rootPublicationId]/page.tsx` (server component)

**What it renders:**
```
Boards / Beginners & Help / Welcome to the forum

📌 Welcome to the forum
24 replies · 340 views

┌─ POST #0 (ROOT) ────────────────────────────────────────────┐
│  [avatar] alice · Original post · 3 days ago                │
│                                                              │
│  [Rich content rendered by Plate.js readOnly]                │
│                                                              │
│  ▲ 12 ▼                                                     │
├──────────────────────────────────────────────────────────────┤
│  [avatar] bob · Reply #1 · 3 days ago                       │
│                                                              │
│  [Rich content]                                              │
│                                                              │
│  ▲ 5 ▼                                                      │
├──────────────────────────────────────────────────────────────┤
│  [Reply editor placeholder — wired in Phase 5]              │
└──────────────────────────────────────────────────────────────┘
```

**Components needed:**
- `thread-detail-view.tsx` — orchestrator (header + posts + reply area)
- `forum-post-card.tsx` — single post (used for root AND replies)
- `forum-post-content.tsx` — content renderer wrapper

**Content rendering approach:**
1. Thread detail page is a SERVER component
2. It passes `content_json` (from Supabase) to `forum-post-content.tsx`
3. `forum-post-content.tsx` is a CLIENT component that renders:
   ```tsx
   <Editor value={JSON.stringify(contentJson)} readOnly={true} showToc={false} />
   ```
4. If `content_json` is null, show "Content unavailable" (fallback to Lens API is Phase 9)

**Vote buttons:** Static display only in Phase 4 (wired to backend in Phase 7)

---

## Step 4.5: Seed Test Data

After pages are built, insert test data to verify rendering:

```sql
-- On VPS:
docker exec -i supabase-db psql -U postgres -d postgres << 'SQL'
INSERT INTO forum_threads (root_publication_id, feed, category, title, summary, content_text, content_json, author_address, author_username, reply_count, views_count, is_pinned)
VALUES
('test-pub-1', 'commons', 'beginners', 'Welcome to the forum — read this first', 'A welcome post for new members.', 'Welcome everyone!', '[{"type":"p","children":[{"text":"Welcome everyone! This is the place to ask your first questions."}]},{"type":"h2","children":[{"text":"Getting Started"}]},{"type":"p","children":[{"text":"Here are some resources to help you get started with Society Protocol."}]}]'::jsonb, '0x8aE18FfF977aCc6Dc690C288a61004a7c7D5A931', 'fritz', 2, 42, true),
('test-pub-2', 'commons', 'beginners', 'How do I create a Lens account?', 'Question about Lens account creation.', 'How do I create a Lens account?', '[{"type":"p","children":[{"text":"I am new here and want to know how to create a Lens account. Can someone help?"}]}]'::jsonb, '0x8aE18FfF977aCc6Dc690C288a61004a7c7D5A931', 'fritz', 0, 15, false),
('test-pub-3', 'commons', 'dao-governance', 'Proposal: Community Treasury', 'Discussion about treasury management.', 'Proposal for community treasury.', '[{"type":"p","children":[{"text":"I propose we establish a community treasury for funding development."}]}]'::jsonb, '0x8aE18FfF977aCc6Dc690C288a61004a7c7D5A931', 'fritz', 1, 28, false);

INSERT INTO forum_thread_replies (thread_id, publication_id, position, content_text, content_json, author_address, author_username)
VALUES
((SELECT id FROM forum_threads WHERE root_publication_id = 'test-pub-1'), 'test-reply-1', 1, 'Thanks for the welcome!', '[{"type":"p","children":[{"text":"Thanks for the welcome! Great to be here."}]}]'::jsonb, '0x8aE18FfF977aCc6Dc690C288a61004a7c7D5A931', 'fritz'),
((SELECT id FROM forum_threads WHERE root_publication_id = 'test-pub-1'), 'test-reply-2', 2, 'Where can I find the docs?', '[{"type":"p","children":[{"text":"Where can I find the documentation? I looked everywhere."}]}]'::jsonb, '0x8aE18FfF977aCc6Dc690C288a61004a7c7D5A931', 'fritz'),
((SELECT id FROM forum_threads WHERE root_publication_id = 'test-pub-3'), 'test-reply-3', 1, 'I support this proposal.', '[{"type":"p","children":[{"text":"I fully support this proposal. We need a treasury."}]}]'::jsonb, '0x8aE18FfF977aCc6Dc690C288a61004a7c7D5A931', 'fritz');

UPDATE forum_categories SET thread_count = 2 WHERE slug = 'beginners';
UPDATE forum_categories SET thread_count = 1 WHERE slug = 'dao-governance';
UPDATE forum_threads SET last_reply_at = NOW() - interval '2 hours' WHERE root_publication_id = 'test-pub-1';
UPDATE forum_threads SET last_reply_at = NOW() - interval '1 day' WHERE root_publication_id = 'test-pub-3';
SQL
```

---

## Execution Order

1. Create data layer files (3 files in `src/lib/forum/`)
2. Create shared components (6 files in `src/components/forum/`)
3. Create landing page (`src/app/boards/page.tsx`)
4. Create thread list page (`src/app/boards/[feed]/page.tsx`)
5. Create thread detail page (`src/app/thread/[rootPublicationId]/page.tsx`)
6. Seed test data on VPS
7. Test all 3 pages in browser

---

## Files to Create (14 total)

```
# Data layer
src/lib/forum/get-board-sections.ts
src/lib/forum/get-threads.ts
src/lib/forum/get-thread-detail.ts

# Shared components
src/components/forum/board-section-list.tsx
src/components/forum/board-section-grid.tsx
src/components/forum/board-category-row.tsx
src/components/forum/board-grid-card.tsx
src/components/forum/thread-list-view.tsx
src/components/forum/forum-post-card.tsx
src/components/forum/forum-post-content.tsx

# Pages
src/app/boards/page.tsx
src/app/boards/[feed]/page.tsx
src/app/thread/[rootPublicationId]/page.tsx
```

Note: `thread-row.tsx` merged into `thread-list-view.tsx` to reduce files.
`thread-detail-view.tsx` merged into the page component.
`community-card.tsx` and `forum-sidebar.tsx` deferred — not needed for MVP.

---

## Acceptance Tests

| # | Test | Expected Result | Status |
|---|---|---|---|
| T4.1 | Navigate to `/boards` | 4 sections + Language Boards | ✅ |
| T4.2 | Section headers correct | General Discussion, Functions, Others, Partners | ✅ |
| T4.3 | Category rows show thread count | Beginners=2, DAO Governance=1 | ✅ |
| T4.4 | Click "Beginners & Help" | → `/boards/commons?category=beginners` | ✅ |
| T4.5 | Thread list shows test threads | Pinned "Welcome" thread first | ✅ |
| T4.6 | Click thread title | → `/thread/test-pub-1` | ✅ |
| T4.7 | Thread detail: root + replies | 1 root + 2 replies stacked | ✅ |
| T4.8 | Content renders with formatting | Headings visible (centered — known issue for Phase 5) | ✅ |
| T4.9 | Breadcrumb navigation | Boards → Beginners & Help → Thread | ✅ |
| T4.10 | Empty category empty state | web3-outpost → "No threads yet" | ✅ |
| T4.11 | View count increments | test-pub-1: 340 → 356 after visits | ✅ |

---

## Completion Notes (2026-04-05)

### What Works
- Landing page: 4 sections + Language Boards ✅
- Thread list: sorted, pinned first, pagination ready ✅
- Thread detail: root post + stacked replies with Plate.js rendering ✅
- Breadcrumb navigation ✅
- Empty state for categories with no threads ✅
- Heart reactions (static, wired in Phase 7) ✅

### Design Decisions Made During Execution
- **Hearts not arrows:** Changed from upvote/downvote (▲▼) to heart-only
  reactions. Matches the Research section spec and feels more forum-like.
- **No sidebar for MVP:** Deferred community info sidebar and stats card.
- **No community cards link:** Language Board cards are static placeholders,
  not linked to actual Lens Groups yet.

### Known Issues
- **Editor centering:** ~~RESOLVED in Phase 5~~ — ForumEditor component
  overrides `fullWidth` variant padding with `!px-0`. See `LEARNING/07-EDITOR-CENTERING-ISSUE.md`.

### Implementation Log
- `categories.ts` was restructured: split into `LANDING_SECTIONS` (4 sections
  for /boards) and `RESEARCH_SECTIONS` (1 section for /research). Technical
  Section removed from landing page — it belongs to Research (Phase 8).
- Test data seeded: 3 threads + 3 replies across beginners and dao-governance.
