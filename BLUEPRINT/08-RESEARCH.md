# Phase 8: Research Section (UPDATED)

## Goal

Build the `/research` page — a single-stream view of all Research Feed
threads with category badges, tag pills, and filter dropdowns. By the
end, users can browse, filter, and post to the Research section.

## Depends On

Phase 7 ✅ (hearts, moderation, quote-reply working)

---

## Fountain Code to Study First

| Need | Fountain file | What to learn |
|---|---|---|
| Feed filtering | `src/contexts/feed-context.tsx` | How Fountain manages feed state |
| Feed display | `src/components/feed/feed-articles.tsx` | Rendering a list of posts |
| Search | `src/components/feed/feed-search.tsx` | Search input pattern |
| Tag rendering | `src/components/post/post-tags.tsx` | How Fountain renders tags |

**Forum delta:** New filter toolbar UI, category colors, tag pills.
Data comes from Supabase (not Lens feed directly). Same query patterns
as `get-threads.ts` from Phase 4.

---

## What Already Exists (from earlier phases)

| Thing | Status | Where |
|---|---|---|
| `RESEARCH_SECTIONS` with 6 categories | ✅ Phase 3 | `src/lib/forum/categories.ts` |
| `forum_categories` table with 6 technical rows | ✅ Phase 3 | Supabase |
| `tags TEXT[]` column on `forum_threads` | ✅ Phase 3 | Supabase |
| Research Feed + Group onchain | ✅ Phase 2 | Constants in `constants.ts` |
| `get-threads.ts` (query threads by feed/category) | ✅ Phase 4 | `src/lib/forum/get-threads.ts` |
| Heart reactions | ✅ Phase 7 | `use-forum-heart.ts` |
| Quote-reply | ✅ Phase 7 | Composer accepts `quotedText` |
| Moderation (pin/lock/hide) | ✅ Phase 7 | `mod-actions.tsx` |
| Composer + publish flow | ✅ Phase 5-6 | Works for research feed |
| Lens Display mode (title_link) | ✅ Phase 6 fix | Content doesn't leak |

**What's NOT done yet:**
- `/research` page and route
- Filter toolbar component
- Category color mapping
- Research-specific thread row (with badge + tags)
- Tag input in composer (for research threads)
- Research header button on forum nav

---

## Design Decisions

1. **Research is a FLAT stream, not nested boards.** Unlike Commons
   (`/boards → /boards/[feed]?category=[slug]`), Research shows ALL
   threads in one list, filterable by category and tag dropdowns.

2. **Category = ONE per thread.** Colored badge. Set at creation time.
   Stored in `forum_threads.category` (same column Commons uses).

3. **Tags = MULTIPLE per thread.** Gray pills. Stored in
   `forum_threads.tags TEXT[]`. Set at creation time via composer.

4. **Thread detail reuses `/thread/[rootPublicationId]`.** No separate
   research thread page. Same stacked-post layout. The thread page
   already has hearts, moderation, and quote-reply from Phase 7.

5. **Token gating deferred.** The Research Group is currently open
   (no approval rule). Token gating requires a token contract to
   exist first. We build the UI now, add the gate later.

6. **Category colors are hardcoded.** 6 categories, 6 colors. No
   admin UI to change them. Defined in `categories.ts`.

---

## Steps

### Step 8.1: Add Category Colors

Update `src/lib/forum/categories.ts` — add a `color` field to the
Research categories.

```ts
// Add to Category interface:
color?: string;

// Research categories get colors:
{ slug: "architecture",  color: "#3b82f6" }  // blue
{ slug: "state-machine", color: "#a855f7" }  // purple
{ slug: "consensus",     color: "#f97316" }  // orange
{ slug: "cryptography",  color: "#ef4444" }  // red
{ slug: "account-system",color: "#06b6d4" }  // cyan
{ slug: "security",      color: "#eab308" }  // yellow
```

Also add colors to the Functions categories (they're `feed: "research"`
too and may appear on the research page):

```ts
{ slug: "game-theory",    color: "#10b981" }  // emerald
{ slug: "hunting",        color: "#84cc16" }  // lime
{ slug: "property",       color: "#f59e0b" }  // amber
// ... etc
```

**Files:** `src/lib/forum/categories.ts`

---

### Step 8.2: Research Data Fetcher

Create `src/lib/forum/get-research-threads.ts`

Queries `forum_threads` where `feed = 'research'`, with optional
category and tag filters. Returns threads with pagination.

```ts
interface ResearchFilters {
  category?: string;   // slug
  tag?: string;        // single tag to filter by
  page?: number;
  pageSize?: number;
}
```

Query logic:
- Base: `SELECT * FROM forum_threads WHERE feed = 'research'`
- If category: `AND category = $category`
- If tag: `AND $tag = ANY(tags)`
- Order: `is_pinned DESC, last_reply_at DESC`
- Pagination: `LIMIT $pageSize OFFSET ($page - 1) * $pageSize`

Also fetch: distinct tags across all research threads (for the tag
dropdown), and thread counts per category (for the category dropdown).

**Files:** `src/lib/forum/get-research-threads.ts`

---

### Step 8.3: Category Badge Component

Create `src/components/forum/category-badge.tsx`

Small pill with colored dot + category name:

```
🔵 Architecture    🟣 State Machine    🟠 Consensus
```

Props: `slug`, `name`, `color`. Renders a colored circle (8x8) + text.
Clickable — navigates to `/research?category=[slug]`.

**Files:** `src/components/forum/category-badge.tsx`

---

### Step 8.4: Tag Pill Component

Create `src/components/forum/tag-pill.tsx`

Gray rounded pill with `#` prefix:

```
#hunting  #game-theory  #zk
```

Clickable — navigates to `/research?tag=[tag]`.

**Files:** `src/components/forum/tag-pill.tsx`

---

### Step 8.5: Filter Toolbar

Create `src/components/forum/research-filter-toolbar.tsx`

Client component. Layout:

```
[All Categories ▾]  [All Tags ▾]  [Latest]     [+ New Topic]
```

**Category dropdown:** Lists all research categories with colored dot,
name, and thread count. Selecting one updates URL to
`/research?category=[slug]`.

**Tag dropdown:** Lists all tags found across research threads. Selecting
one updates URL to `/research?tag=[tag]`.

**Latest button:** Clears both filters (navigates to `/research`).

**New Topic button:** Opens composer with research feed pre-selected.

Uses `useRouter` and `useSearchParams` to read/write URL query params.

**Files:** `src/components/forum/research-filter-toolbar.tsx`

---

### Step 8.6: Research Thread Row

Create `src/components/forum/research-thread-row.tsx`

Two-line row:

```
Line 1: Thread title                              Replies  Views  Activity
Line 2: 🟠 Consensus  #hunting  #game-theory       by @user
```

Reuses the same data shape as `thread-list-view.tsx` but adds:
- Category badge (colored, from Step 8.3)
- Tag pills (gray, from Step 8.4)

**Files:** `src/components/forum/research-thread-row.tsx`

---

### Step 8.7: Research Page

Create `src/app/research/page.tsx`

Server component. Layout:

```
Header: "Society Protocol Research"
Filter toolbar (client component)
Thread list (research thread rows)
Pagination
```

Reads `searchParams.category` and `searchParams.tag` to pass filters
to `getResearchThreads()`.

Wraps with ComposerProvider (same pattern as `/boards`).

**Files:**
- `src/app/research/page.tsx`
- `src/app/research/layout.tsx` (ComposerProvider wrapper)

---

### Step 8.8: Tag Input in Composer

When composing a thread for the research feed, the composer header
should show a tag input field below the title.

Simple implementation: comma-separated text input that splits into
an array on publish. No autocomplete for MVP.

```
Title: [My research thread title          ]
Tags:  [hunting, game-theory, zk          ]
```

Update `composer-header.tsx` to show tag input when mode is "thread"
and the selected category belongs to the research feed.

Update `publish-thread.ts` to include tags in the Supabase insert
and in the Lens metadata attributes.

**Files:**
- `src/components/forum/composer-header.tsx` (update)
- `src/lib/forum/publish-thread.ts` (update)
- `src/app/api/forum/threads/route.ts` (update — accept tags)

---

### Step 8.9: Research Button in Navigation

Add a "Research" link to the forum navigation. This could be:
- A button on the `/boards` landing page header
- A link in the site header

For now: add a link on the `/boards` page, near the top.

**Files:** `src/app/boards/page.tsx` (update)

---

## Execution Order

| Step | What | Effort | New files |
|---|---|---|---|
| 8.1 | Category colors in categories.ts | Small | 0 (update) |
| 8.2 | Research data fetcher | Small | 1 |
| 8.3 | Category badge component | Small | 1 |
| 8.4 | Tag pill component | Small | 1 |
| 8.5 | Filter toolbar | Medium | 1 |
| 8.6 | Research thread row | Small | 1 |
| 8.7 | Research page + layout | Medium | 2 |
| 8.8 | Tag input in composer | Medium | 0 (updates) |
| 8.9 | Research nav link | Small | 0 (update) |

**Total: 7 new files, 4 file updates.**

---

## What's Deferred

| Feature | Why | When |
|---|---|---|
| Token gating | No token contract yet | When token exists |
| Tag autocomplete | Nice-to-have, not MVP | Phase 10 polish |
| Research thread detail page | Reuses `/thread/[id]` — no separate page needed | N/A |
| Post numbering (#1, #2) | Already works from Phase 4 | N/A |
| Permalink button | Small feature, Phase 10 | Phase 10 |

---

## Files to Create

```
src/lib/forum/get-research-threads.ts
src/components/forum/category-badge.tsx
src/components/forum/tag-pill.tsx
src/components/forum/research-filter-toolbar.tsx
src/components/forum/research-thread-row.tsx
src/app/research/page.tsx
src/app/research/layout.tsx
```

## Files to Update

```
src/lib/forum/categories.ts              — add color field
src/components/forum/composer-header.tsx  — tag input for research
src/lib/forum/publish-thread.ts          — include tags
src/app/api/forum/threads/route.ts       — accept tags
src/app/boards/page.tsx                  — research nav link
```

---

## Database Changes

**None required.** The `tags TEXT[]` column already exists on
`forum_threads` from Phase 3. Category colors are in code, not DB.

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T8.1 | Navigate to `/research` | Page renders with filter toolbar |
| T8.2 | All research threads visible (no filter) | Sorted by pinned first, then latest |
| T8.3 | Select category from dropdown | Only threads with that category shown |
| T8.4 | Select tag from dropdown | Only threads with that tag shown |
| T8.5 | Category + tag combined | Intersection of both filters |
| T8.6 | Click "Latest" | Filters cleared |
| T8.7 | Thread rows show colored category badge | Correct color per category |
| T8.8 | Thread rows show tag pills | Gray pills with # prefix |
| T8.9 | Click category badge | Navigates to `/research?category=[slug]` |
| T8.10 | Click tag pill | Navigates to `/research?tag=[tag]` |
| T8.11 | Create research thread with tags | Tags saved and visible on thread row |
| T8.12 | Research link visible on boards page | Links to `/research` |

---

## Visual Reference

**Source:** `PlanExecution/mockup-research-fountain.html`
Open in browser to see the exact target.

### Full Page Layout

```
┌─ HEADER (56px, sticky, blur backdrop) ───────────────────────┐
│ Society Protocol  [Search...]  [🔒 Research]      🔔  [U]   │
└──────────────────────────────────────────────────────────────┘

┌─ PAGE (max-width: 960px, centered) ─────────────────────────┐
│                                                              │
│  🔒 Society Protocol Research                                │
│  Technical research and discussion — token-gated posting     │
│                                                              │
│  ┌─ FILTER TOOLBAR ────────────────────────────────────────┐ │
│  │ [■ All Categories ▾] [All Tags ▾] Latest   [+ New Topic]│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ THREAD TABLE ──────────────────────────────────────────┐ │
│  │ Topic              Started by  Replies  Views  Activity │ │
│  │──────────────────────────────────────────────────────────│ │
│  │ Proof of Hunt...   🟢 alice      12      230     3h     │ │
│  │ 🟠 Consensus  #hunting  #game-theory                    │ │
│  │                                                          │ │
│  │ State machine...   🟢 bob         5       89     1d     │ │
│  │ 🟣 State Machine                                        │ │
│  │                                                          │ │
│  │ ZK-SNARK...        🟢 carol       8      145     2d     │ │
│  │ 🔴 Cryptography  #zk  #account-system                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│                      [Load More]                             │
└──────────────────────────────────────────────────────────────┘
```

### Research Header

```
Font: 22px, weight 700, letter-spacing -0.3px
Icon: 🔒 inline with text
Subtitle: 13px, muted-fg color, 2px margin-top
Margin-bottom: 8px
```

### Filter Toolbar

```
Layout: flex, gap 8px, wrap on mobile
Border-bottom: 1px solid var(--border)
Padding-bottom: 16px
Margin: 20px 0

Category dropdown trigger:
  - 10x10 colored square (transparent border when "All")
  - Text: "All Categories"
  - Arrow: ▾ in muted-fg, 9px
  - Padding: 6px 12px
  - Border: 1px solid var(--border)
  - Border-radius: 6px
  - Hover: background var(--muted)

Tag dropdown trigger:
  - Same style, no colored square
  - Text: "All Tags"

Latest tab:
  - Font-weight: 600
  - Border-bottom: 2px solid var(--fg)
  - No border/background

New Topic button:
  - margin-left: auto (pushed to right)
  - btn-primary btn-sm style
```

### Thread Row (two-line)

```
Line 1: Topic title
  - Font: 14px, weight 500
  - Color: var(--fg)
  - Hover: opacity 0.8

Line 2: Category badge + tag pills
  - Margin-top: 5px
  - Flex, gap 6px, wrap

Category badge:
  ┌──────────────────┐
  │ ■ Consensus      │  ← 8x8 colored square + text
  └──────────────────┘
  - Background: var(--muted)
  - Padding: 2px 8px
  - Border-radius: 4px
  - Font: 12px, weight 500

Tag pill:
  ┌──────────────────┐
  │ #hunting         │  ← gray border pill
  └──────────────────┘
  - Border: 1px solid var(--border)
  - Padding: 1px 7px
  - Border-radius: 4px
  - Font: 11px, color muted-fg

Author cell:
  - 7px green dot + name
  - Font: 13px, color muted-fg

Stats columns:
  - Replies/Views: 13px, center, muted-fg
  - Activity: 12px, center, muted-fg
```

### Category Colors (exact values from mockup)

```
architecture    → #3b82f6  (blue)
state-machine   → #a855f7  (purple)
consensus       → #f97316  (orange)
cryptography    → #ef4444  (red)
account-system  → #06b6d4  (cyan)
security        → #eab308  (yellow)
game-theory     → #10b981  (emerald)
```

### Column Widths

```
Topic:      55%
Started by: 14%
Replies:     9% (center)
Views:       9% (center)
Activity:   10% (center)
```

### Mobile (< 768px)

```
- Only Topic column visible
- Author, Replies, Views, Activity: display none
- Search input: hidden
- Filter toolbar: wraps to multiple lines
```

### Design Tokens (shared with landing page)

```css
--bg:         hsl(222.2 84% 4.9%)        /* dark background */
--fg:         hsl(210 40% 98%)           /* light text */
--muted:      hsl(217.2 32.6% 17.5%)    /* muted backgrounds */
--muted-fg:   hsl(215 20.2% 65.1%)      /* muted text */
--border:     hsl(217.2 32.6% 17.5%)    /* borders */
--primary:    hsl(210 40% 98%)           /* primary buttons */
--primary-fg: hsl(222.2 47.4% 11.2%)    /* primary button text */
--radius:     0.5rem
--research-accent: hsl(45 80% 55%)       /* amber for Research */

Font: Inter, weights 400/500/600/700
Max width: 960px centered
Header: 56px sticky, blur backdrop
```


---

## Completion Notes (2026-04-07)

### What Was Done
- Steps 8.1–8.9 all executed
- Research page at `/research` with filter toolbar, category badges, tag pills
- Composer shows category dropdown + tag dropdown when on research pages
- "🔒 Research" button in global header (replaces Write button on forum pages)
- Theme-aware styling (amber-800 light / amber-400 dark)

### Key Decision: Categories vs Tags in Research

During implementation, we clarified the separation:

| Type | Items | Purpose |
|---|---|---|
| **Categories** (one per thread) | 6 Technical: Architecture, State Machine, Consensus, Cryptography, Account System, Security | Primary classification of research threads |
| **Tags** (many per thread) | 11 Functions: Game Theory, Function Ideas, Hunting, Property, Parenting, Governance, Organizations, Curation, Farming, Portal, Communication | Cross-referencing which Functions relate to the technical work |

**Why:** Functions have their own dedicated boards on the landing page
for open discussion. Research is for technical implementation details.
Tags let researchers reference which Functions are relevant without
mixing the two conversation spaces.

**Rule:** Category dropdown in Research filters to `section === "technical"` only.
Function names populate the tag dropdown.

### Changes from Original Plan
- Removed Functions from Research category dropdown (they're tags now)
- Tag input changed from free-text to dropdown with Function names
- Category selector added to composer (was missing in original 8.8)
- Research button moved from landing page to global header
- Header button replaces Write button only on forum pages (`/boards`, `/thread`, `/research`)
- Button sizing matched to Feedback button (h-10, text-sm)
- Theme-aware colors added (dark: amber-400, light: amber-800)

### Files Created
```
src/lib/forum/get-research-threads.ts        ✅
src/components/forum/category-badge.tsx       ✅
src/components/forum/tag-pill.tsx             ✅
src/components/forum/research-filter-toolbar.tsx ✅
src/components/forum/research-thread-row.tsx  ✅
src/app/research/page.tsx                     ✅
src/app/research/layout.tsx                   ✅
```

### Files Updated
```
src/lib/forum/categories.ts                  ✅ Added color field
src/components/forum/composer-header.tsx      ✅ Category dropdown + tag dropdown
src/components/forum/composer-panel.tsx       ✅ Category/tag state, research detection
src/lib/forum/publish-thread.ts              ✅ Tags passed to API
src/app/api/forum/threads/route.ts           ✅ Tags saved to Supabase
src/components/navigation/header.tsx         ✅ Research button on forum pages
src/app/boards/page.tsx                      ✅ Removed duplicate research link
```
