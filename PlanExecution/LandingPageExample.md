# Landing Page — Visual Structure Specification

## Purpose of This Document

This document describes the visual layout of the Society Protocol Forum
landing page (homepage) with enough precision for an AI agent to implement
it. It uses ASCII wireframes, component trees, exact data shapes, and
pixel-level layout descriptions.

---

## Page URL

`/boards` (this is the homepage — `/` redirects here)

## Page Width

Max width: `max-w-7xl` (1280px). Centered. Horizontal padding: `px-4`.

## Overall Layout

Two-column layout on desktop. Single column on mobile.

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (sticky, full width — see separate spec)                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────┐  ┌──────────────────┐  │
│  │                                     │  │                  │  │
│  │         MAIN CONTENT                │  │    SIDEBAR       │  │
│  │         (flex-1)                    │  │    (w-72, lg+)   │  │
│  │                                     │  │                  │  │
│  │  Section 1: GENERAL DISCUSSION      │  │  Community Info   │  │
│  │  Section 2: FUNCTIONS (grid)        │  │  Quick Links     │  │
│  │  Section 3: TECHNICAL (locked)      │  │  Stats           │  │
│  │  Section 4: PARTNER COMMUNITIES     │  │                  │  │
│  │  Section 5: OTHERS                  │  │                  │  │
│  │  Section 6: LOCAL (community cards) │  │                  │  │
│  │                                     │  │                  │  │
│  └─────────────────────────────────────┘  └──────────────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (optional)                                                │
└──────────────────────────────────────────────────────────────────┘
```

On mobile (`< lg`): sidebar is hidden. Main content is full width.
Bottom padding `pb-16` to clear the mobile bottom navigation bar.

---

## Component Tree

```
BoardsPage (server component)
├── ForumHeader (client, sticky)
├── <div className="mx-auto max-w-7xl px-4 py-8">
│   └── <div className="flex gap-8">
│       ├── <div className="flex-1 min-w-0">  ← MAIN CONTENT
│       │   ├── SectionBlock (GENERAL DISCUSSION, layout="list")
│       │   ├── SectionBlock (FUNCTIONS, layout="grid")
│       │   ├── SectionBlock (TECHNICAL, layout="list", locked=true)
│       │   ├── SectionBlock (PARTNER COMMUNITIES, layout="list")
│       │   ├── SectionBlock (OTHERS, layout="list")
│       │   └── LocalSection (community cards grid)
│       │
│       └── <aside className="hidden lg:block w-72 shrink-0">  ← SIDEBAR
│           └── ForumSidebar (sticky top-20)
│               ├── CommunityInfoCard
│               ├── QuickLinksCard
│               └── StatsCard
│
└── ForumMobileNav (client, fixed bottom, mobile only)
```

---

## Section Block — "list" Layout (Used by: General, Partners, Technical, Others)

This is the primary layout. A bordered card with a colored header bar and
a list of category rows.

```
┌──────────────────────────────────────────────────────────────┐
│▌ GENERAL DISCUSSION                                          │ ← header row
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Beginners & Help                          12    340   2h   │ ← category row
│  New to the forum? Start here.          threads  views  ago │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  4 Key Concepts                             5    120   1d   │
│  Core concepts and fundamental...        threads  views  ago │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Web3 Outpost                               3     87   3d   │
│  Web3 integration, badges...             threads  views  ago │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  DAO Governance                             8    210   5h   │
│  Governance discussions...               threads  views  ago │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Header Row
- Left border accent: `border-l-4 border-blue-600`
- Background: `bg-slate-100 dark:bg-gray-700`
- Text: uppercase, `text-sm font-bold tracking-wide`
- If locked: yellow theme — `bg-[#252663]`, `text-yellow-100`, Lock icon before title

### Category Row
- Full-width clickable link → `/boards/commons?category={slug}` or `/boards/research?category={slug}`
- Hover: `hover:bg-muted/50`
- Left side:
  - Category name: `font-medium text-sm` (blue-600 for normal, yellow-400 for locked)
  - Description: `text-xs text-muted-foreground`, single line, truncated
- Right side (desktop only, `hidden md:flex`):
  - Thread count: number + "threads" label, `min-w-[60px] text-center`
  - View count: number + "views" label, `min-w-[60px] text-center`  
  - Last activity: relative time, `min-w-[100px] text-right`
- Divider between rows: `divide-y`

### Locked Variant (Technical Section)
- Outer border: `border-yellow-600/50`
- Background: `bg-[#1a1b4b]` (dark navy)
- Header: `bg-[#252663]` with Lock icon + yellow text
- Category names: `text-yellow-400`
- Description: `text-slate-300`
- Stats text: `text-slate-200` / `text-slate-400`
- Click behavior: shows alert "Token Required" (or redirects to join page)

---

## Section Block — "grid" Layout (Used by: Functions)

A bordered card with a header bar and a grid of category cards inside.

```
┌──────────────────────────────────────────────────────────────┐
│▌ FUNCTIONS (VALUE SYSTEM)                                    │ ← header
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ ✦ Economic Game      │  │ ✦ Function Ideas    │           │ ← row 1: 2 cards
│  │   Theory             │  │                     │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ ✦ Hunting    │ │ ✦ Property   │ │ ✦ Parenting  │         │ ← row 2: 3 cards
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ ✦ Governance │ │ ✦ Organiz.   │ │ ✦ Curation   │         │ ← row 3: 3 cards
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ ✦ Farming    │ │ ✦ Portal     │ │ ✦ Communic.  │         │ ← row 4: 3 cards
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Grid Card
- Clickable link → `/boards/research?category={slug}`
- Border: `border border-slate-200 dark:border-gray-700`
- Background: `bg-white dark:bg-gray-800`
- Hover: `hover:bg-slate-50 dark:hover:bg-gray-700/50`
- Padding: `p-4`
- Content: Sparkles icon (blue-600) + category name (blue-600, font-semibold)
- Layout: `flex items-center gap-3`

### Grid Rows
- Row 1: `grid grid-cols-1 md:grid-cols-2 gap-3` (2 large cards)
- Rows 2–4: `grid grid-cols-1 md:grid-cols-3 gap-3` (3 cards each)
- On mobile: all cards stack to single column

---

## LOCAL Section (Community Cards)

A simple heading + grid of community cards.

```
LOCAL
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   [avatar]   │  │   [avatar]   │  │   [avatar]   │
│              │  │              │  │              │
│  Community A │  │  Community B │  │  Community C │
│  42 members  │  │  18 members  │  │  7 members   │
│  Description │  │  Description │  │  Description │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Heading
- `text-xl font-bold`, no border/card wrapper

### Grid
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

### Community Card
- Clickable link → `/communities/{groupAddress}`
- Border: `border border-slate-200/60 rounded-2xl`
- Background: `bg-white dark:bg-gray-800`
- Hover: `hover:-translate-y-1 hover:shadow-lg`
- Padding: `p-6`
- Content (centered, vertical stack):
  - Avatar: 80x80 rounded-2xl, image or first-letter fallback
  - Name: `text-lg font-semibold`
  - Member count: `text-sm text-slate-500`
  - Description: `text-sm text-muted-foreground line-clamp-2`

---

## Sidebar (Desktop Only, `hidden lg:block w-72`)

```
┌──────────────────┐
│ Society Protocol  │ ← CommunityInfoCard
│                  │
│ A close community│
│ for discussing...│
├──────────────────┤
│ Quick Links      │ ← QuickLinksCard
│                  │
│ • Beginners      │
│ • Announcements  │
│ • Architecture   │
├──────────────────┤
│ Stats            │ ← StatsCard
│                  │
│ 👥 42 Members   │
│ 💬 156 Threads  │
│ 🏘 3 Communities│
└──────────────────┘
```

### Container
- `sticky top-20 space-y-6`

### Each Card
- `border rounded-lg p-4`
- Title: `font-bold text-sm mb-2`
- Content: `text-xs text-muted-foreground` (info card), `text-sm` (links)

### Quick Links
- List of `<a>` tags, `text-muted-foreground hover:text-foreground`
- Links to the most important categories

### Stats Card
- 3 rows, each with icon + label + count
- Same visual style as the current StatsBar but vertical instead of horizontal

---

## Section Rendering Order (Top to Bottom)

1. **GENERAL DISCUSSION** — list layout, 4 categories, blue accent, commons feed
2. **FUNCTIONS (VALUE SYSTEM)** — grid layout, 11 categories, blue accent, research feed
3. **SOCIETY PROTOCOL TECHNICAL SECTION** — list layout, 6 categories, locked (yellow/navy theme), research feed
4. **PARTNER COMMUNITIES** — list layout, 4 categories, blue accent, commons feed
5. **OTHERS** — list layout, 5 categories, blue accent, commons feed
6. **LOCAL** — community cards grid, no section card wrapper

---

## Data Shape (What the Page Receives)

```ts
interface BoardSection {
  id: string                    // "general", "functions", "technical", etc.
  title: string                 // "GENERAL DISCUSSION"
  layout: "list" | "grid"
  isLocked: boolean
  categories: BoardCategory[]
}

interface BoardCategory {
  slug: string                  // "beginners"
  name: string                  // "Beginners & Help"
  description: string           // "New to the forum? Start here."
  feed: "commons" | "research"
  threadCount: number           // from forum_categories.thread_count
  latestActivity: string | null // ISO timestamp of most recent thread activity
}

interface Community {
  id: string
  name: string
  groupAddress: string
  memberCount: number
  description: string | null
  iconUrl: string | null
}
```

---

## Responsive Behavior Summary

| Element | Desktop (lg+) | Tablet (md) | Mobile (<md) |
|---|---|---|---|
| Layout | 2-column (main + sidebar) | 1-column (no sidebar) | 1-column |
| Sidebar | Visible, sticky | Hidden | Hidden |
| List row stats | Visible (threads, views, time) | Visible | Hidden |
| Grid cards | 2-col / 3-col rows | 2-col / 3-col rows | 1-col stack |
| Community cards | 3-col grid | 2-col grid | 1-col stack |
| Bottom nav | Hidden | Hidden | Visible (fixed) |
| Page bottom padding | `pb-0` | `pb-0` | `pb-16` (clears bottom nav) |

---

## Color Theme Reference

| Element | Light Mode | Dark Mode |
|---|---|---|
| Page background | white | gray-900 |
| Section card bg | white | gray-800 |
| Section card border | slate-200 | gray-700 |
| Header bar bg | slate-100 | gray-700 |
| Header text | slate-700 | gray-200 |
| Category name | blue-600 | blue-400 |
| Description text | gray-500 | gray-400 |
| Stats text | gray-500 / slate-700 | gray-400 / gray-200 |
| Locked section bg | #1a1b4b | #1a1b4b |
| Locked header bg | #252663 | #252663 |
| Locked border | yellow-600/50 | yellow-600/50 |
| Locked category name | yellow-400 | yellow-400 |
| Locked description | slate-300 | slate-300 |
| Grid card bg | white | gray-800 |
| Grid card border | slate-200 | gray-700 |
| Sidebar card border | border (default) | border (default) |

---

## Interaction Behavior

| Action | Result |
|---|---|
| Click category row (list) | Navigate to `/boards/{feed}?category={slug}` |
| Click category card (grid) | Navigate to `/boards/{feed}?category={slug}` |
| Click locked category | Show alert OR navigate to membership page |
| Click community card | Navigate to `/communities/{groupAddress}` |
| Click quick link (sidebar) | Navigate to that category's thread list |
| Hover category row | Background changes to `bg-muted/50` |
| Hover community card | Card lifts (`-translate-y-1`) + shadow |
| Hover grid card | Background changes to `bg-slate-50` |
