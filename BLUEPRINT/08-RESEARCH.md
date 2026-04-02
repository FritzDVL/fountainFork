# Phase 8: Research Section — Token-Gated with Categories & Tags

## Goal

Build the Research section with Discourse-style filtering (category dropdown
+ tag dropdown), colored category badges on thread rows, and token-gated
posting. By the end, the Research section is a distinct experience from
the Commons boards.

## Depends On

Phase 7 (forum features working)

## Visual Reference

- `PlanExecution/mockup-research-fountain.html` — research page target
- `PlanExecution/ResearchExample.md` — component-level spec

---

## How Research Differs from Commons

| Aspect | Commons (Boards) | Research |
|---|---|---|
| Navigation | Click board → see threads for that board | Single stream, filter by category/tag |
| Categories | Implicit (URL determines board) | Explicit badges on each thread row |
| Tags | Not used | Multiple per thread, gray pills |
| Category colors | None | Per-category colored squares |
| Post numbering | "Reply #N" | "#N" (right-aligned, prominent) |
| Reactions | ▲ score ▼ | ♡ heart (single reaction) |
| Access | Group membership (approval) | Token-gated posting (anyone reads) |
| Filter toolbar | None | Category dropdown + Tag dropdown + Latest |

## Steps

### 8.1 Research Page

**File:** `src/app/research/page.tsx`

**URL:** `/research` (or `/research?category=consensus&tag=hunting`)

**Layout:**
```
Page header: "🔒 Society Protocol Research"
Filter toolbar: [All Categories ▾] [All Tags ▾] Latest    [+ New Topic]
Thread table: same 5-column layout but with category badges + tags
```

**Data fetching:** `src/lib/forum/get-research-threads.ts`
- Query `forum_threads` where `feed = 'research'`
- Filter by category and/or tag if query params present
- Tags stored as `tags TEXT[]` array column on `forum_threads`

### 8.2 Filter Toolbar

**File:** `src/components/forum/research-filter-toolbar.tsx`

Client component with two custom dropdowns:

**Category Dropdown:**
```
┌─────────────────────────┐
│ All Categories          │
│ 🔵 Architecture    × 8  │
│ 🟣 State Machine   × 3  │
│ 🟠 Consensus       × 4  │
│ 🔴 Cryptography    × 6  │
│ 🔵 Account System  × 2  │
│ 🟡 Security        × 1  │
│ 🟢 Game Theory     × 5  │
└─────────────────────────┘
```

Each option: colored square (10x10, rounded-sm) + name + thread count.
Selecting a category updates the URL query param: `?category=consensus`.

**Tag Dropdown:**
Similar structure but with `#tagname` format and gray squares.
Tags come from a distinct query on `forum_threads.tags`.

**Latest Tab:**
Clears both filters, shows all research threads sorted by activity.

### 8.3 Research Category Colors

**File:** `src/lib/forum/research-categories.ts`

```ts
export const RESEARCH_CATEGORY_COLORS: Record<string, string> = {
  architecture: '#3b82f6',    // blue
  'state-machine': '#a855f7', // purple
  consensus: '#f97316',       // orange
  cryptography: '#ef4444',    // red
  'account-system': '#06b6d4',// cyan
  security: '#eab308',        // yellow
  'game-theory': '#10b981',   // emerald
}
```

### 8.4 Research Thread Row

**File:** `src/components/forum/research-thread-row.tsx`

Same as regular thread row but with a second line:
```
Proof of Hunt consensus mechanism — formal analysis
🟠 Consensus  #hunting  #game-theory
```

Category badge: colored square + name in a rounded pill.
Tags: gray pills with `#` prefix.

### 8.5 Research Thread Detail

**File:** `src/app/research/thread/[rootPublicationId]/page.tsx`

Same stacked-post layout as Commons threads but with:
- Post numbers `#1`, `#2`, `#3` right-aligned (instead of "Reply #N")
- Heart reactions instead of upvote/downvote
- Permalink button (🔗) that copies `#post-N` anchor URL
- Reply button (💬) that opens composer with quote

### 8.6 Heart Reactions

**Hook:** `src/hooks/forum/use-heart-reaction.ts`

Uses Lens `addReaction(PostReactionType.Upvote)` — same as upvote but
displayed as a heart. No downvote option in Research.

### 8.7 Token Gating (Research Feed)

The Research Feed already has `GroupGatedFeedRule` from Phase 2.
For additional token gating:

**Option A (recommended, start here):** `TokenGatedFeedRule` on Research Feed.
Anyone joins the Research Group (can read), only token holders publish.

```ts
tokenGatedRule: {
  token: {
    currency: evmAddress("0xYourToken"),
    standard: TokenStandard.Erc20,
    value: bigDecimal("100"),
  },
}
```

**Option B (stricter):** `TokenGatedGroupRule` on Research Group itself.
Only token holders can even join.

This is configured during Phase 2's group/feed creation. If not set up
initially, it can be added later by updating the feed rules.

### 8.8 Tags Column on forum_threads

Add `tags TEXT[]` column if not already present:

```sql
ALTER TABLE forum_threads ADD COLUMN tags TEXT[] DEFAULT '{}';
CREATE INDEX idx_forum_threads_tags ON forum_threads USING GIN (tags);
```

Tags are set during thread creation (Phase 6 publish flow) and stored
both in Supabase and in Lens metadata tags.

### 8.9 Research Header Button

Add "🔒 Research" button to the forum header (from Phase 4).
Links to `/research`. Styled with amber/gold accent color.

---

## Acceptance Tests

| # | Test | Expected Result |
|---|---|---|
| T8.1 | Navigate to `/research` | Research page renders with filter toolbar |
| T8.2 | All research threads visible (no filter) | Sorted by latest activity |
| T8.3 | Select "Consensus" from category dropdown | Only Consensus threads shown |
| T8.4 | Select "#hunting" from tag dropdown | Only threads with #hunting tag shown |
| T8.5 | Category + tag filter combined | Intersection of both filters |
| T8.6 | Click "Latest" | Filters cleared, all threads shown |
| T8.7 | Thread rows show colored category badge | Correct color per category |
| T8.8 | Thread rows show tag pills | Gray pills with # prefix |
| T8.9 | Research thread detail shows #N numbering | Posts numbered #1, #2, #3 |
| T8.10 | Heart reaction works | Heart fills, count increments |
| T8.11 | Permalink button copies URL | Toast: "Link copied!" |
| T8.12 | Reply button opens composer with quote | Quoted text in blockquote |
| T8.13 | Non-token-holder tries to post | Rejected (if token gating enabled) |
| T8.14 | Token holder posts successfully | Thread created in Research feed |
| T8.15 | "🔒 Research" button in header | Links to /research |

## Files Created

```
src/app/research/page.tsx
src/app/research/thread/[rootPublicationId]/page.tsx
src/lib/forum/get-research-threads.ts
src/lib/forum/research-categories.ts
src/components/forum/research-filter-toolbar.tsx
src/components/forum/research-thread-row.tsx
src/components/forum/research-post-card.tsx
src/hooks/forum/use-heart-reaction.ts
```
