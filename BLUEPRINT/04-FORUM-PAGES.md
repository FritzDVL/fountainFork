# Phase 4: Forum Pages — Landing, Board List, Thread Detail

## Goal

Build the read-only forum UI: landing page with board sections, thread
list filtered by category, and thread detail with stacked entries. By the
end, users can browse the forum (with test data seeded manually).

## Depends On

Phase 3 (database tables exist)

## Visual References

- `PlanExecution/mockup-landing-fountain.html` — landing page target
- `PlanExecution/mockup-board-fountain.html` — thread list target
- `PlanExecution/LandingPageExample.md` — component-level spec
- `PlanExecution/BoardExample.md` — thread list + thread detail spec

---

## Routes

```
/boards                              → Landing page (board sections)
/boards/commons?category=[slug]      → Thread list for a child-board
/thread/[rootPublicationId]          → Thread detail (stacked entries)
```

## Steps

### 4.1 Landing Page — `/boards`

**File:** `src/app/boards/page.tsx` (server component)

**Layout:** Two-column on desktop (main + sidebar), single column on mobile.

**Main content:** 5 section blocks rendered top-to-bottom:
1. GENERAL DISCUSSION — list layout, 4 categories, commons feed
2. FUNCTIONS (VALUE SYSTEM) — grid layout, 11 categories, research feed
3. SOCIETY PROTOCOL TECHNICAL — list layout, 6 categories, locked theme
4. PARTNER COMMUNITIES — list layout, 4 categories, commons feed
5. OTHERS — list layout, 5 categories, commons feed

Plus: LOCAL section with community cards at bottom.

**Data fetching:** `src/lib/forum/get-board-sections.ts`
- Query `forum_categories` for thread counts
- Query `forum_threads` for latest activity per category
- Merge with static section config from `categories.ts`

**Components to create:**
```
src/components/forum/board-section-list.tsx    — section card (list layout)
src/components/forum/board-section-grid.tsx    — section card (grid layout)
src/components/forum/board-category-row.tsx    — single category row
src/components/forum/board-grid-card.tsx       — single grid card
src/components/forum/community-card.tsx        — language community card
src/components/forum/forum-sidebar.tsx         — desktop sidebar
```

**Visual spec (from mockup-landing-fountain.html):**
- Section header: muted bg, uppercase text, left accent bar
- Category row: name + description left, thread count + views + activity right
- Grid cards: bordered, icon + label, 2-col first row then 3-col
- Community cards: centered avatar + name + member count + description
- Max width: 960px centered

### 4.2 Thread List — `/boards/[feed]`

**File:** `src/app/boards/[feed]/page.tsx` (server component)

**URL:** `/boards/commons?category=beginners`

**Layout:** Breadcrumb → page header (title + description + "New Thread" button) → thread table.

**Data fetching:** `src/lib/forum/get-threads.ts`
```sql
SELECT * FROM forum_threads
WHERE category = $1 AND is_hidden = false
ORDER BY is_pinned DESC, last_reply_at DESC NULLS LAST
LIMIT 20 OFFSET $2
```

**Components to create:**
```
src/components/forum/thread-list-view.tsx      — table with thread rows
src/components/forum/thread-row.tsx            — single thread row
```

**Visual spec (from mockup-board-fountain.html):**
- Table columns: Topic (55%) | Started by (14%) | Replies (9%) | Views (9%) | Activity (10%)
- Pinned threads: 📌 icon before title
- Author: green dot + username
- Mobile: only Topic column visible
- "Load More" button at bottom

### 4.3 Thread Detail — `/thread/[rootPublicationId]`

**File:** `src/app/thread/[rootPublicationId]/page.tsx` (server component)

**Layout:** Breadcrumb → thread header → root post card → reply cards (stacked) → reply editor placeholder.

**Data fetching:** `src/lib/forum/get-thread-detail.ts`
- Fetch thread from `forum_threads` by `root_publication_id`
- Fetch replies from `forum_thread_replies` ordered by `position`
- Increment view count via `forum_increment_views`

**Components to create:**
```
src/components/forum/thread-detail-view.tsx    — orchestrator
src/components/forum/forum-post-card.tsx       — single post (root or reply)
src/components/forum/forum-post-content.tsx    — content renderer
```

**Content rendering strategy:**
1. If `content_json` exists in Supabase → render directly with Plate.js readOnly
2. Fallback: fetch from Lens API via `fetchPost` → read `contentJson` attribute
3. Render with: `<PlateEditor value={contentJson} readOnly={true} showToc={false} />`

**Visual spec (from BoardExample.md):**
- Each post: avatar + author + position label + timestamp → content → vote buttons
- Root post labeled "Original post", replies labeled "Reply #N"
- Vote buttons: ▲ score ▼
- External link icon → `/publication/[id]` (standalone view)
- Border-bottom between posts
- Reply editor placeholder at bottom (wired in Phase 5)

### 4.4 Data Layer Functions

```
src/lib/forum/get-board-sections.ts    — landing page data
src/lib/forum/get-threads.ts           — thread list with pagination
src/lib/forum/get-thread-detail.ts     — thread + replies
```

All use `import { createClient } from "@/lib/db/server"` (server client).

### 4.5 Seed Test Data

Manually insert 3-5 test threads with replies into Supabase to verify
the UI renders correctly before the publish flow exists (Phase 6).

```sql
INSERT INTO forum_threads (root_publication_id, feed, category, title, ...)
VALUES ('test-pub-1', 'commons', 'beginners', 'Welcome to the forum', ...);

INSERT INTO forum_thread_replies (thread_id, publication_id, position, ...)
VALUES (...);
```

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T4.1 | Navigate to `/boards` | Landing page renders with 5 sections |
| T4.2 | Section headers show correct titles | GENERAL DISCUSSION, FUNCTIONS, etc. |
| T4.3 | Category rows show thread count + activity | Numbers from Supabase |
| T4.4 | Click "Beginners & Help" | Navigates to `/boards/commons?category=beginners` |
| T4.5 | Thread list shows test threads | Sorted by pinned first, then last_reply_at |
| T4.6 | Click thread title | Navigates to `/thread/[id]` |
| T4.7 | Thread detail shows root post + replies | Stacked vertically, numbered |
| T4.8 | Content renders with formatting | Bold, headings, code blocks visible |
| T4.9 | Breadcrumb navigation works | Boards → Category → Thread |
| T4.10 | Mobile: stats columns hidden | Only Topic column visible |
| T4.11 | Empty category shows empty state | "No threads yet" message |
| T4.12 | View count increments on page load | `views_count` increases in DB |

## Files Created

```
src/app/boards/page.tsx
src/app/boards/[feed]/page.tsx
src/app/thread/[rootPublicationId]/page.tsx
src/lib/forum/get-board-sections.ts
src/lib/forum/get-threads.ts
src/lib/forum/get-thread-detail.ts
src/components/forum/board-section-list.tsx
src/components/forum/board-section-grid.tsx
src/components/forum/board-category-row.tsx
src/components/forum/board-grid-card.tsx
src/components/forum/community-card.tsx
src/components/forum/forum-sidebar.tsx
src/components/forum/thread-list-view.tsx
src/components/forum/thread-row.tsx
src/components/forum/thread-detail-view.tsx
src/components/forum/forum-post-card.tsx
src/components/forum/forum-post-content.tsx
```
